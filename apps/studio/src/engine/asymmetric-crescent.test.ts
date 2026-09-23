import assert from "node:assert/strict";
import test from "node:test";
import { blueprintPayloadSchema, INVENTORY_SCHEMA_VERSION } from "@/lib/contracts";
import { generateAsymmetricCrescent, partitionIntoOddClusters, type GenerateBlueprintInput } from "./asymmetric-crescent";
import { angleInClockwiseArc, angleToClockPosition, polarToPhysical, polarToScreen } from "./geometry";

const GREEN_ID = "00000000-0000-4000-8000-000000000001";
const FOCAL_ID = "00000000-0000-4000-8000-000000000002";
const ACCENT_ID = "00000000-0000-4000-8000-000000000003";

const baseInput: GenerateBlueprintInput = {
  seed: "gate-one-contract",
  essenceId: "essence-peaceful-remembrance",
  inventorySnapshot: {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    snapshotId: "inventory-locked-v1",
    capturedAt: "2026-09-22T00:00:00.000Z",
    items: [
      { inventoryItemId: GREEN_ID, sku: "EC-CEDAR-001", name: "Cedar Spray", source: "evercrafted", role: "structural_green", status: "active", quantityAvailable: 20 },
      { inventoryItemId: FOCAL_ID, sku: "EC-HYD-001", name: "Hydrangea", source: "evercrafted", role: "focal", status: "active", quantityAvailable: 10 },
      { inventoryItemId: ACCENT_ID, sku: "EC-BRU-001", name: "Brunia", source: "evercrafted", role: "accent", status: "active", quantityAvailable: 10 },
    ],
  },
  selectedItems: [
    { inventoryItemId: GREEN_ID, quantity: 12 },
    { inventoryItemId: FOCAL_ID, quantity: 4 },
    { inventoryItemId: ACCENT_ID, quantity: 3 },
  ],
  finishedDiameterIn: 24,
  focalClock: 2,
};

function approximately(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} did not equal ${expected}`);
}

test("uses the canonical clock coordinate system and explicit screen transform", () => {
  const top = polarToPhysical(10, 0);
  approximately(top.xIn, 0); approximately(top.yIn, 10);
  const right = polarToPhysical(10, 90);
  approximately(right.xIn, 10); approximately(right.yIn, 0);
  const bottom = polarToPhysical(10, 180);
  approximately(bottom.xIn, 0); approximately(bottom.yIn, -10);
  const left = polarToPhysical(10, 270);
  approximately(left.xIn, -10); approximately(left.yIn, 0);
  assert.deepEqual(polarToScreen(100, 100, 10, 0), { x: 100, y: 90 });
  assert.deepEqual(polarToScreen(100, 100, 10, 90), { x: 110, y: 100 });
  assert.equal(angleToClockPosition(0), "12:00");
  assert.equal(angleToClockPosition(90), "3:00");
  assert.equal(angleInClockwiseArc(355, 350, 20), true);
  assert.equal(angleInClockwiseArc(180, 350, 20), false);
});

test("produces schema-valid byte-identical blueprints", () => {
  const first = generateAsymmetricCrescent(baseInput);
  const second = generateAsymmetricCrescent(baseInput);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.doesNotThrow(() => blueprintPayloadSchema.parse(first));
  assert.equal(first.composition.formulaId, "asymmetric_crescent");
  assert.equal(first.quality.status, "NEEDS_REVIEW");
  assert.equal(first.quality.physicalCollisionCheck, "PENDING");
});

test("uses only locked in-stock inventory and rejects over-allocation", () => {
  const blueprint = generateAsymmetricCrescent(baseInput);
  const allowed = new Set([GREEN_ID, FOCAL_ID, ACCENT_ID]);
  assert.ok(blueprint.placements.every((placement) => allowed.has(placement.inventoryItemId)));
  const overAllocated = { ...baseInput, selectedItems: [{ inventoryItemId: FOCAL_ID, quantity: 11 }] };
  assert.throws(() => generateAsymmetricCrescent(overAllocated), /not sufficiently in stock/);
  const unknown = { ...baseInput, selectedItems: [{ inventoryItemId: "00000000-0000-4000-8000-000000000099", quantity: 1 }] };
  assert.throws(() => generateAsymmetricCrescent(unknown), /not in the locked snapshot/);
});

test("partitions every focal total into odd clusters", () => {
  for (let total = 1; total <= 40; total += 1) {
    const clusters = partitionIntoOddClusters(total);
    assert.equal(clusters.reduce((sum, size) => sum + size, 0), total);
    assert.ok(clusters.every((size) => size % 2 === 1));
  }
  const blueprint = generateAsymmetricCrescent(baseInput);
  const counts = new Map<string, number>();
  blueprint.placements.filter((placement) => placement.role === "focal").forEach((placement) => {
    counts.set(placement.clusterId!, (counts.get(placement.clusterId!) ?? 0) + 1);
  });
  assert.ok([...counts.values()].every((count) => count % 2 === 1));
  assert.equal(blueprint.quality.evenFocalClusters, 0);
});

test("keeps all placements outside the absolute silence arc across 300 seeds", () => {
  for (let index = 0; index < 300; index += 1) {
    const focalClock = ((index % 3) + 1) as 1 | 2 | 3;
    const blueprint = generateAsymmetricCrescent({ ...baseInput, seed: `stress-${index}`, focalClock });
    assert.equal(blueprint.quality.silenceArcViolations, 0);
  }
});

test("emits passes in the same canonical draw order as placements", () => {
  const blueprint = generateAsymmetricCrescent(baseInput);
  const passIds = [
    ...blueprint.passes.foundationPlacementIds,
    ...blueprint.passes.bodyPlacementIds,
    ...blueprint.passes.focalPlacementIds,
    ...blueprint.passes.finishPlacementIds,
  ];
  assert.deepEqual(passIds, blueprint.placements.map((placement) => placement.placementId));
});
