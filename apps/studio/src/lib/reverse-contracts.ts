import { z } from "zod";

export const reverseRoleSchema=z.enum(["greenery","focal","secondary","filler","accent","ribbon","decorative"]);

export const reversePlacementSchema=z.object({
  materialName:z.string().trim().max(120),
  role:reverseRoleSchema,
  clockPosition:z.string(),
  angleDeg:z.number(),
  radiusIn:z.number().nonnegative(),
  widthIn:z.number().nonnegative().default(3),
  heightIn:z.number().nonnegative().default(3),
  rotationDeg:z.number().default(0),
  layer:z.string().default("observed"),
  quantity:z.number().positive().default(1),
});

export const reverseAnalysisSchema=z.object({
  formulaId:z.string(),
  confidence:z.number().min(0).max(1),
  summary:z.string(),
  palette:z.array(z.string()).max(8).default([]),
  observedMaterials:z.array(z.object({
    name:z.string(),
    role:reverseRoleSchema,
    color:z.string().optional(),
  })).max(30).default([]),
  placements:z.array(reversePlacementSchema).max(80),
  notes:z.array(z.string()).max(20).default([]),
});
