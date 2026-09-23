import { z } from "zod";

export const BLUEPRINT_SCHEMA_VERSION = "evercrafted.blueprint/1.0" as const;
export const COMPOSITION_SCHEMA_VERSION = "evercrafted.composition/1.0" as const;
export const ESSENCE_SCHEMA_VERSION = "evercrafted.essence/1.0" as const;
export const INVENTORY_SCHEMA_VERSION = "evercrafted.inventory/1.0" as const;

export const coordinateConventionSchema = z.strictObject({
  origin: z.literal("wreath_center"),
  zeroAngle: z.literal("12_o_clock"),
  positiveRotation: z.literal("clockwise"),
  physicalYAxis: z.literal("up"),
  units: z.literal("inches"),
});

export const COORDINATE_CONVENTION = {
  origin: "wreath_center",
  zeroAngle: "12_o_clock",
  positiveRotation: "clockwise",
  physicalYAxis: "up",
  units: "inches",
} as const;

export const startingModeSchema = z.enum(["memory", "inventory", "manual", "existing_wreath"]);
export const materialRoleSchema = z.enum([
  "base",
  "structural_green",
  "transitional_green",
  "focal",
  "secondary",
  "supporting",
  "filler",
  "accent",
  "ribbon",
  "decorative",
]);

export const createProjectSchema = z.strictObject({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(140),
  startingMode: startingModeSchema,
  brief: z.string().max(12000).optional(),
});

export const essenceSchema = z.strictObject({
  schemaVersion: z.literal(ESSENCE_SCHEMA_VERSION),
  essenceId: z.string().min(1),
  summary: z.string().min(1).max(1200),
  emotionalKeywords: z.array(z.string().min(1)).min(1).max(12),
  palette: z.array(z.string().min(1)).min(1).max(12),
  atmosphere: z.string().min(1).max(500),
  symbolism: z.array(z.string().min(1)).max(12),
  sourceMode: startingModeSchema,
});

export const inventoryItemSchema = z.strictObject({
  inventoryItemId: z.string().uuid(),
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  source: z.enum(["evercrafted", "workspace", "client"]),
  role: materialRoleSchema,
  status: z.enum(["active", "inactive", "archived"]),
  quantityAvailable: z.number().int().nonnegative(),
  widthIn: z.number().positive().optional(),
  heightIn: z.number().positive().optional(),
  depthIn: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
});

export const inventorySnapshotSchema = z.strictObject({
  schemaVersion: z.literal(INVENTORY_SCHEMA_VERSION),
  snapshotId: z.string().min(1),
  capturedAt: z.string().datetime(),
  items: z.array(inventoryItemSchema),
});

export const compositionSpecSchema = z.strictObject({
  schemaVersion: z.literal(COMPOSITION_SCHEMA_VERSION),
  formulaId: z.string().min(1),
  formulaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  seed: z.string().trim().min(1),
  finishedDiameterIn: z.number().positive(),
  baseDiameterIn: z.number().positive(),
  focalClock: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  flowDirection: z.enum(["clockwise", "counterclockwise"]),
  density: z.enum(["airy", "balanced", "lush"]),
  coordinateConvention: coordinateConventionSchema,
});

export const placementSchema = z.strictObject({
  placementId: z.string().min(1),
  inventoryItemId: z.string().uuid(),
  sku: z.string().min(1),
  role: materialRoleSchema,
  pocketId: z.string().optional(),
  clusterId: z.string().optional(),
  clockPosition: z.string().regex(/^(?:[1-9]|1[0-2]):[0-5]\d$/),
  angleDeg: z.number().min(0).lt(360),
  radiusIn: z.number().nonnegative(),
  xIn: z.number(),
  yIn: z.number(),
  widthIn: z.number().positive().optional(),
  heightIn: z.number().positive().optional(),
  depthIn: z.number().positive().optional(),
  rotationDeg: z.number().min(0).lt(360),
  scale: z.number().positive(),
  layer: z.enum(["foundation", "body", "focal", "finish"]),
  zOrder: z.number().int().nonnegative(),
  quantity: z.literal(1),
  locked: z.literal(true),
  placementReason: z.string().min(1),
});

export const blueprintPayloadSchema = z.strictObject({
  schemaVersion: z.literal(BLUEPRINT_SCHEMA_VERSION),
  blueprintId: z.string().min(1),
  essenceId: z.string().min(1),
  inventorySnapshotId: z.string().min(1),
  composition: compositionSpecSchema,
  base: z.strictObject({ type: z.enum(["grapevine", "wire", "foam", "other"]), diameterIn: z.number().positive() }),
  anchors: z.array(z.strictObject({
    anchorId: z.string().min(1), role: z.string().min(1), angleDeg: z.number().min(0).lt(360),
    radiusIn: z.number().nonnegative(), xIn: z.number(), yIn: z.number(),
  })),
  pockets: z.array(z.strictObject({
    pocketId: z.string().min(1), centerAngleDeg: z.number().min(0).lt(360), halfWidthDeg: z.number().positive().max(90),
  })),
  placements: z.array(placementSchema),
  silenceArcs: z.array(z.strictObject({
    startAngleDeg: z.number().min(0).lt(360), endAngleDeg: z.number().min(0).lt(360), minimumClearanceIn: z.number().nonnegative(),
  })),
  bowSpec: z.strictObject({ required: z.boolean(), anchorAngleDeg: z.number().min(0).lt(360).optional() }),
  constraints: z.strictObject({
    realInventoryOnly: z.literal(true), inStockOnly: z.literal(true), oddFocalClusters: z.literal(true), preserveOpenCenter: z.literal(true),
  }),
  passes: z.strictObject({
    foundationPlacementIds: z.array(z.string()), bodyPlacementIds: z.array(z.string()),
    focalPlacementIds: z.array(z.string()), finishPlacementIds: z.array(z.string()),
  }),
  quality: z.strictObject({
    status: z.enum(["PASSED", "NEEDS_REVIEW", "FAILED"]),
    silenceArcViolations: z.number().int().nonnegative(), missingInventoryReferences: z.number().int().nonnegative(),
    stockViolations: z.number().int().nonnegative(), evenFocalClusters: z.number().int().nonnegative(),
    physicalCollisionCheck: z.enum(["PENDING", "PASSED", "FAILED"]), collisionCount: z.number().int().nonnegative(),
    notes: z.array(z.string()),
  }),
});

export type MaterialRole = z.infer<typeof materialRoleSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventorySnapshot = z.infer<typeof inventorySnapshotSchema>;
export type BlueprintPayload = z.infer<typeof blueprintPayloadSchema>;
