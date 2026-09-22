import { z } from "zod";

export const startingModeSchema = z.enum(["memory", "inventory", "manual", "existing_wreath"]);

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(140),
  startingMode: startingModeSchema,
  brief: z.string().max(12000).optional(),
});

export const placementSchema = z.object({
  placementId: z.string(),
  materialId: z.string().uuid().nullable(),
  role: z.enum(["base","greenery","focal","secondary","filler","accent","ribbon","decorative"]),
  clockPosition: z.string(),
  angleDeg: z.number(),
  radiusIn: z.number().nonnegative(),
  xIn: z.number(),
  yIn: z.number(),
  widthIn: z.number().nonnegative(),
  heightIn: z.number().nonnegative(),
  depthIn: z.number().nonnegative().optional(),
  rotationDeg: z.number(),
  layer: z.string(),
  zOrder: z.number().int(),
  quantity: z.number().positive().default(1),
});

export const blueprintPayloadSchema = z.object({
  schemaVersion: z.literal("evercrafted.blueprint/1.0"),
  base: z.record(z.string(), z.unknown()),
  anchors: z.array(z.record(z.string(), z.unknown())),
  pockets: z.array(z.record(z.string(), z.unknown())),
  placements: z.array(placementSchema),
  silenceArcs: z.array(z.record(z.string(), z.unknown())),
  bowSpec: z.record(z.string(), z.unknown()),
  constraints: z.record(z.string(), z.unknown()),
});
