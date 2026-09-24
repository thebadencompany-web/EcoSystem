ALTER TABLE materials ADD COLUMN IF NOT EXISTS image_key text;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cutout_key text;

CREATE TABLE IF NOT EXISTS product_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE SET NULL,
  material_cost numeric NOT NULL DEFAULT 0,
  labor_minutes integer NOT NULL DEFAULT 90,
  labor_rate_hour numeric NOT NULL DEFAULT 20,
  packaging_cost numeric NOT NULL DEFAULT 8,
  platform_fee_pct numeric NOT NULL DEFAULT 10,
  target_margin_pct numeric NOT NULL DEFAULT 60,
  suggested_price numeric NOT NULL DEFAULT 0,
  listing_title text,
  listing_description text,
  listing_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  material_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_packages_project_updated_idx ON product_packages(project_id,updated_at);

CREATE TABLE IF NOT EXISTS reverse_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  source_key text NOT NULL,
  source_content_type text,
  source_filename text,
  analysis_status text NOT NULL DEFAULT 'uploaded',
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_formula_id text,
  proposed_blueprint jsonb NOT NULL DEFAULT '{}'::jsonb,
  committed_blueprint_id uuid REFERENCES blueprints(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reverse_imports_created_idx ON reverse_imports(created_at);
