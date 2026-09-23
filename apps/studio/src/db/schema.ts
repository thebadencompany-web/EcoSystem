import {
  pgTable, text, timestamp, integer, numeric, jsonb, boolean, uuid, index, uniqueIndex
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  plan: text("plan").notNull().default("bloom"),
  status: text("status").notNull().default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  ownerIdx: index("workspaces_owner_idx").on(t.ownerUserId),
}));

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  membershipUnique: uniqueIndex("workspace_members_workspace_user_uq").on(t.workspaceId, t.userId),
  userIdx: index("workspace_members_user_idx").on(t.userId),
}));

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  startingMode: text("starting_mode").notNull(),
  brief: text("brief"),
  essence: jsonb("essence").notNull().default({}),
  emotionProfile: jsonb("emotion_profile").notNull().default({}),
  inventoryScope: text("inventory_scope").notNull().default("workspace"),
  formulaId: text("formula_id"),
  formulaVersion: text("formula_version"),
  seed: text("seed"),
  wreathSpec: jsonb("wreath_spec").notNull().default({}),
  compositionSpec: jsonb("composition_spec").notNull().default({}),
  currentBlueprintId: uuid("current_blueprint_id"),
  approvedRenderId: uuid("approved_render_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceUpdatedIdx: index("projects_workspace_updated_idx").on(t.workspaceId, t.updatedAt),
}));

export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("workspace"),
  sku: text("sku").notNull(),
  supplierSku: text("supplier_sku"),
  supplier: text("supplier"),
  name: text("name").notNull(),
  botanicalFamily: text("botanical_family"),
  role: text("role"),
  color: text("color"),
  colorFamily: text("color_family"),
  seasonTags: jsonb("season_tags").notNull().default([]),
  emotionTags: jsonb("emotion_tags").notNull().default([]),
  lengthIn: numeric("length_in"),
  widthIn: numeric("width_in"),
  depthIn: numeric("depth_in"),
  directionality: text("directionality"),
  texture: text("texture"),
  finish: text("finish"),
  visualWeight: numeric("visual_weight"),
  quantity: numeric("quantity").notNull().default("0"),
  unitCost: numeric("unit_cost").notNull().default("0"),
  imageUrl: text("image_url"),
  cutoutUrl: text("cutout_url"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceSkuUnique: uniqueIndex("materials_workspace_sku_uq").on(t.workspaceId, t.sku),
  workspaceRoleIdx: index("materials_workspace_role_idx").on(t.workspaceId, t.role),
}));

export const blueprints = pgTable("blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull().default("evercrafted.blueprint/1.0"),
  revision: integer("revision").notNull(),
  status: text("status").notNull().default("draft"),
  base: jsonb("base").notNull().default({}),
  anchors: jsonb("anchors").notNull().default([]),
  pockets: jsonb("pockets").notNull().default([]),
  placements: jsonb("placements").notNull().default([]),
  silenceArcs: jsonb("silence_arcs").notNull().default([]),
  bowSpec: jsonb("bow_spec").notNull().default({}),
  constraints: jsonb("constraints").notNull().default({}),
  qualityResults: jsonb("quality_results").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (t) => ({
  revisionUnique: uniqueIndex("blueprints_project_revision_uq").on(t.projectId, t.revision),
  workspaceIdx: index("blueprints_workspace_idx").on(t.workspaceId),
}));

export const renderJobs = pgTable("render_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  blueprintId: uuid("blueprint_id").notNull().references(() => blueprints.id, { onDelete: "restrict" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  prompt: text("prompt").notNull(),
  settings: jsonb("settings").notNull().default({}),
  referenceAssets: jsonb("reference_assets").notNull().default([]),
  status: text("status").notNull().default("queued"),
  providerJobId: text("provider_job_id"),
  outputUrl: text("output_url"),
  qualityStatus: text("quality_status"),
  qualityResults: jsonb("quality_results").notNull().default({}),
  estimatedCost: numeric("estimated_cost"),
  actualCost: numeric("actual_cost"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  workspaceStatusIdx: index("render_jobs_workspace_status_idx").on(t.workspaceId, t.status),
}));

export const usageLedger = pgTable("usage_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  provider: text("provider"),
  model: text("model"),
  units: numeric("units").notNull().default("1"),
  estimatedCost: numeric("estimated_cost"),
  actualCost: numeric("actual_cost"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceCreatedIdx: index("usage_ledger_workspace_created_idx").on(t.workspaceId, t.createdAt),
}));

export const projectAssets = pgTable("project_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  storageUrl: text("storage_url").notNull(),
  mimeType: text("mime_type"),
  metadata: jsonb("metadata").notNull().default({}),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
