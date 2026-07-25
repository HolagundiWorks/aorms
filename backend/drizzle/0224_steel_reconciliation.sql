-- 0224 — Steel reconciliation (consultancy site-check).
-- Links to esti_bbs for scheduled kg by diameter. RA bills stay on pmcRaBills.

CREATE TABLE IF NOT EXISTS esti_steel_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  bbs_id uuid REFERENCES esti_bbs(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  scheduled_kg double precision NOT NULL DEFAULT 0,
  issued_kg double precision NOT NULL DEFAULT 0,
  consumed_kg double precision NOT NULL DEFAULT 0,
  wastage_kg double precision NOT NULL DEFAULT 0,
  finalized_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_steel_recon_project_idx ON esti_steel_reconciliation(project_id);

CREATE TABLE IF NOT EXISTS esti_steel_reconciliation_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES esti_steel_reconciliation(id) ON DELETE CASCADE,
  dia_mm double precision NOT NULL,
  scheduled_kg double precision NOT NULL DEFAULT 0,
  issued_kg double precision NOT NULL DEFAULT 0,
  consumed_kg double precision NOT NULL DEFAULT 0,
  wastage_kg double precision NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_steel_recon_item_dia_uq
  ON esti_steel_reconciliation_item(reconciliation_id, dia_mm);
