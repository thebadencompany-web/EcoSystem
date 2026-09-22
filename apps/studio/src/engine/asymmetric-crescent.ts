import {
  BLUEPRINT_SCHEMA_VERSION, COMPOSITION_SCHEMA_VERSION, COORDINATE_CONVENTION,
  blueprintPayloadSchema, inventorySnapshotSchema,
  type BlueprintPayload, type InventoryItem, type MaterialRole,
} from "@/lib/contracts";
import { angleInClockwiseArc, angleToClockPosition, normalizeAngle, polarToPhysical } from "./geometry";
import { createSeededRandom, randomBetween, stableIdentifier } from "./seed";

export const ASYMMETRIC_CRESCENT_FORMULA_ID = "asymmetric_crescent" as const;
export const ASYMMETRIC_CRESCENT_FORMULA_VERSION = "1.0.0" as const;

export type BlueprintSelection = { inventoryItemId: string; quantity: number };
export type GenerateBlueprintInput = {
  seed: string;
  essenceId: string;
  inventorySnapshot: unknown;
  selectedItems: BlueprintSelection[];
  finishedDiameterIn: number;
  baseDiameterIn?: number;
  baseType?: "grapevine" | "wire" | "foam" | "other";
  focalClock: 1 | 2 | 3;
  flowDirection?: "clockwise" | "counterclockwise";
  density?: "airy" | "balanced" | "lush";
};

type ExpandedItem = InventoryItem & { ordinal: number };
const ROLE_ORDER: Record<MaterialRole, number> = {
  base: 0, structural_green: 1, transitional_green: 2, supporting: 3, secondary: 4,
  focal: 5, filler: 6, accent: 7, ribbon: 8, decorative: 9,
};

function round(value: number): number { return Math.round(value * 1000) / 1000; }

export function partitionIntoOddClusters(total: number): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error("Cluster total must be a nonnegative integer.");
  if (total === 0) return [];
  const clusters: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    if (remaining <= 5 && remaining % 2 === 1) { clusters.push(remaining); break; }
    if (remaining === 2 || remaining === 4) { clusters.push(remaining - 1, 1); break; }
    clusters.push(5);
    remaining -= 5;
  }
  return clusters;
}

function layerForRole(role: MaterialRole): "foundation" | "body" | "focal" | "finish" {
  if (role === "base" || role === "structural_green") return "foundation";
  if (role === "focal" || role === "secondary") return "focal";
  if (role === "ribbon" || role === "decorative" || role === "accent") return "finish";
  return "body";
}

function assertAndExpandInventory(input: GenerateBlueprintInput): { items: ExpandedItem[]; snapshotId: string } {
  const snapshot = inventorySnapshotSchema.parse(input.inventorySnapshot);
  const byId = new Map(snapshot.items.map((item) => [item.inventoryItemId, item]));
  const expanded: ExpandedItem[] = [];
  for (const selection of input.selectedItems) {
    if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) throw new Error("Selected quantities must be positive integers.");
    const item = byId.get(selection.inventoryItemId);
    if (!item) throw new Error(`Inventory item ${selection.inventoryItemId} is not in the locked snapshot.`);
    if (item.status !== "active") throw new Error(`SKU ${item.sku} is not active.`);
    if (selection.quantity > item.quantityAvailable) throw new Error(`SKU ${item.sku} is not sufficiently in stock.`);
    for (let ordinal = 0; ordinal < selection.quantity; ordinal += 1) expanded.push({ ...item, ordinal });
  }
  expanded.sort((left, right) => ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
    || left.sku.localeCompare(right.sku) || left.inventoryItemId.localeCompare(right.inventoryItemId) || left.ordinal - right.ordinal);
  if (!expanded.some((item) => item.role === "focal")) throw new Error("Asymmetric crescent requires at least one focal item.");
  return { items: expanded, snapshotId: snapshot.snapshotId };
}

function collisionCount(placements: BlueprintPayload["placements"]): { count: number; pending: boolean } {
  if (placements.some((item) => !item.widthIn || !item.heightIn)) return { count: 0, pending: true };
  let count = 0;
  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const left = placements[leftIndex];
      const right = placements[rightIndex];
      if (left.clusterId && left.clusterId === right.clusterId) continue;
      const distance = Math.hypot(left.xIn - right.xIn, left.yIn - right.yIn);
      const clearance = Math.min(left.widthIn!, left.heightIn!, right.widthIn!, right.heightIn!) * 0.18;
      if (distance < clearance) count += 1;
    }
  }
  return { count, pending: false };
}

export function generateAsymmetricCrescent(input: GenerateBlueprintInput): BlueprintPayload {
  if (!input.seed.trim()) throw new Error("A deterministic seed is required.");
  if (!Number.isFinite(input.finishedDiameterIn) || input.finishedDiameterIn <= 0) throw new Error("Finished diameter must be positive.");
  const locked = assertAndExpandInventory(input);
  const inventory = locked.items;
  const flowDirection = input.flowDirection ?? "clockwise";
  const direction = flowDirection === "clockwise" ? 1 : -1;
  const density = input.density ?? "balanced";
  const focalAngle = input.focalClock * 30;
  const baseDiameterIn = input.baseDiameterIn ?? input.finishedDiameterIn * 0.75;
  const baseRadius = input.finishedDiameterIn * 0.39;
  const silenceStart = normalizeAngle(focalAngle + 120);
  const silenceEnd = normalizeAngle(focalAngle + 240);
  const random = createSeededRandom(`${ASYMMETRIC_CRESCENT_FORMULA_VERSION}|${input.seed}`);
  const focals = inventory.filter((item) => item.role === "focal");
  const nonFocals = inventory.filter((item) => item.role !== "focal");
  const clusterSizes = partitionIntoOddClusters(focals.length);
  const placements: BlueprintPayload["placements"] = [];

  const addPlacement = (item: ExpandedItem, angle: number, radius: number, reason: string, pocketId?: string, clusterId?: string) => {
    const angleDeg = normalizeAngle(angle);
    const point = polarToPhysical(radius, angleDeg);
    const layer = layerForRole(item.role);
    const zOrder = { foundation: 10, body: 20, focal: 30, finish: 40 }[layer];
    placements.push({
      placementId: stableIdentifier("placement", `${input.seed}|${item.inventoryItemId}|${item.ordinal}`),
      inventoryItemId: item.inventoryItemId, sku: item.sku, role: item.role, pocketId, clusterId,
      clockPosition: angleToClockPosition(angleDeg), angleDeg: round(angleDeg), radiusIn: round(radius),
      xIn: round(point.xIn), yIn: round(point.yIn), widthIn: item.widthIn, heightIn: item.heightIn, depthIn: item.depthIn,
      rotationDeg: round(normalizeAngle(angleDeg + randomBetween(random, -7, 7))), scale: 1, layer, zOrder,
      quantity: 1, locked: true, placementReason: reason,
    });
  };

  nonFocals.forEach((item, index) => {
    const ratio = nonFocals.length <= 1 ? 0.5 : index / (nonFocals.length - 1);
    const angle = focalAngle + direction * (-92 + ratio * 184) + randomBetween(random, -2.5, 2.5);
    addPlacement(item, angle, baseRadius + randomBetween(random, -0.45, 0.45), "Deterministic crescent sweep from locked inventory.");
  });

  let focalCursor = 0;
  clusterSizes.forEach((clusterSize, clusterIndex) => {
    for (let memberIndex = 0; memberIndex < clusterSize; memberIndex += 1) {
      const item = focals[focalCursor++];
      const clusterOffset = clusterSizes.length <= 1 ? 0 : -12 + clusterIndex * (24 / (clusterSizes.length - 1));
      const memberOffset = clusterSize <= 1 ? 0 : -12 + memberIndex * (24 / (clusterSize - 1));
      addPlacement(item, focalAngle + clusterOffset + memberOffset + randomBetween(random, -1.5, 1.5),
        baseRadius + 0.45 + randomBetween(random, -0.15, 0.15), "Odd-numbered focal microcluster at the emotional anchor.",
        `pocket_${clusterIndex + 1}`, `focal_cluster_${clusterIndex + 1}`);
    }
  });

  placements.sort((left, right) => left.zOrder - right.zOrder || left.placementId.localeCompare(right.placementId));
  const silenceArcViolations = placements.filter((item) => angleInClockwiseArc(item.angleDeg, silenceStart, silenceEnd)).length;
  const knownIds = new Set(inventory.map((item) => item.inventoryItemId));
  const missingInventoryReferences = placements.filter((item) => !knownIds.has(item.inventoryItemId)).length;
  const evenFocalClusters = clusterSizes.filter((size) => size % 2 === 0).length;
  const collisions = collisionCount(placements);
  const failed = silenceArcViolations > 0 || missingInventoryReferences > 0 || evenFocalClusters > 0 || collisions.count > 0;
  const notes = collisions.pending ? ["Inventory geometry is incomplete; physical collision approval remains pending."] : [];
  if (failed) notes.push("Resolve deterministic quality violations before rendering.");
  const anchor = polarToPhysical(baseRadius, focalAngle);

  return blueprintPayloadSchema.parse({
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    blueprintId: stableIdentifier("blueprint", `${input.essenceId}|${input.seed}|${locked.snapshotId}`),
    essenceId: input.essenceId,
    inventorySnapshotId: locked.snapshotId,
    composition: {
      schemaVersion: COMPOSITION_SCHEMA_VERSION, formulaId: ASYMMETRIC_CRESCENT_FORMULA_ID,
      formulaVersion: ASYMMETRIC_CRESCENT_FORMULA_VERSION, seed: input.seed,
      finishedDiameterIn: input.finishedDiameterIn, baseDiameterIn, focalClock: input.focalClock,
      flowDirection, density, coordinateConvention: COORDINATE_CONVENTION,
    },
    base: { type: input.baseType ?? "grapevine", diameterIn: baseDiameterIn },
    anchors: [{ anchorId: "emotional_focal_anchor", role: "hero", angleDeg: focalAngle, radiusIn: round(baseRadius), xIn: round(anchor.xIn), yIn: round(anchor.yIn) }],
    pockets: clusterSizes.map((_, index) => ({ pocketId: `pocket_${index + 1}`,
      centerAngleDeg: normalizeAngle(focalAngle + (clusterSizes.length <= 1 ? 0 : -12 + index * (24 / (clusterSizes.length - 1)))), halfWidthDeg: 18 })),
    placements,
    silenceArcs: [{ startAngleDeg: silenceStart, endAngleDeg: silenceEnd, minimumClearanceIn: 1 }],
    bowSpec: { required: inventory.some((item) => item.role === "ribbon") },
    constraints: { realInventoryOnly: true, inStockOnly: true, oddFocalClusters: true, preserveOpenCenter: true },
    passes: {
      foundationPlacementIds: placements.filter((item) => item.layer === "foundation").map((item) => item.placementId),
      bodyPlacementIds: placements.filter((item) => item.layer === "body").map((item) => item.placementId),
      focalPlacementIds: placements.filter((item) => item.layer === "focal").map((item) => item.placementId),
      finishPlacementIds: placements.filter((item) => item.layer === "finish").map((item) => item.placementId),
    },
    quality: {
      status: failed ? "FAILED" : collisions.pending ? "NEEDS_REVIEW" : "PASSED",
      silenceArcViolations, missingInventoryReferences, stockViolations: 0, evenFocalClusters,
      physicalCollisionCheck: collisions.pending ? "PENDING" : collisions.count > 0 ? "FAILED" : "PASSED",
      collisionCount: collisions.count, notes,
    },
  });
}
