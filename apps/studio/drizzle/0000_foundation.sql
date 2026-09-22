CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id text NOT NULL,
  plan text NOT NULL DEFAULT 'bloom',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_user_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_uq ON workspace_members(workspace_id,user_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  starting_mode text NOT NULL,
  brief text,
  essence jsonb NOT NULL DEFAULT '{}'::jsonb,
  emotion_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  inventory_scope text NOT NULL DEFAULT 'workspace',
  formula_id text,
  formula_version text,
  seed text,
  wreath_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  composition_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_blueprint_id uuid,
  approved_render_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_workspace_updated_idx ON projects(workspace_id,updated_at);

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'workspace',
  sku text NOT NULL,
  supplier_sku text, supplier text, name text NOT NULL, botanical_family text, role text,
  color text, color_family text,
  season_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  emotion_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  length_in numeric, width_in numeric, depth_in numeric,
  directionality text, texture text, finish text, visual_weight numeric,
  quantity numeric NOT NULL DEFAULT 0, unit_cost numeric NOT NULL DEFAULT 0,
  image_url text, cutout_url text, status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS materials_workspace_sku_uq ON materials(workspace_id,sku);
CREATE INDEX IF NOT EXISTS materials_workspace_role_idx ON materials(workspace_id,role);

CREATE TABLE IF NOT EXISTS blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  schema_version text NOT NULL DEFAULT 'evercrafted.blueprint/1.0',
  revision integer NOT NULL, status text NOT NULL DEFAULT 'draft',
  base jsonb NOT NULL DEFAULT '{}'::jsonb, anchors jsonb NOT NULL DEFAULT '[]'::jsonb,
  pockets jsonb NOT NULL DEFAULT '[]'::jsonb, placements jsonb NOT NULL DEFAULT '[]'::jsonb,
  silence_arcs jsonb NOT NULL DEFAULT '[]'::jsonb, bow_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb, quality_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS blueprints_project_revision_uq ON blueprints(project_id,revision);
CREATE INDEX IF NOT EXISTS blueprints_workspace_idx ON blueprints(workspace_id);

CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_id uuid NOT NULL REFERENCES blueprints(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL, model text NOT NULL, prompt_version text NOT NULL, prompt text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb, reference_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued', provider_job_id text, output_url text,
  quality_status text, quality_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost numeric, actual_cost numeric, error_message text,
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS render_jobs_workspace_status_idx ON render_jobs(workspace_id,status);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  category text NOT NULL, provider text, model text, units numeric NOT NULL DEFAULT 1,
  estimated_cost numeric, actual_cost numeric, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_ledger_workspace_created_idx ON usage_ledger(workspace_id,created_at);

CREATE TABLE IF NOT EXISTS project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind text NOT NULL, storage_url text NOT NULL, mime_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
