-- 0221 — Steel reconciliation + Running/RA bills (consultancy certification).
-- Steel recon links to esti_bbs; RA bills are free-form contractor bills
-- (no work-package / site measurement-record spine).

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

CREATE TABLE IF NOT EXISTS esti_running_bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES esti_contractor(id) ON DELETE SET NULL,
  title text NOT NULL,
  bill_type text NOT NULL DEFAULT 'RA',
  status text NOT NULL DEFAULT 'DRAFT',
  measurement_date date,
  notes text,
  total_paise bigint NOT NULL DEFAULT 0,
  retention_paise bigint NOT NULL DEFAULT 0,
  advance_recovery_paise bigint NOT NULL DEFAULT 0,
  tax_tds_paise bigint NOT NULL DEFAULT 0,
  other_recovery_paise bigint NOT NULL DEFAULT 0,
  net_payable_paise bigint NOT NULL DEFAULT 0,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_running_bill_project_idx ON esti_running_bill(project_id);

CREATE TABLE IF NOT EXISTS esti_running_bill_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  running_bill_id uuid NOT NULL REFERENCES esti_running_bill(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  unit text NOT NULL,
  qty double precision NOT NULL DEFAULT 0,
  rate_paise bigint NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  previous_billed_qty double precision NOT NULL DEFAULT 0,
  cumulative_billed_qty double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_running_bill_item_bill_idx ON esti_running_bill_item(running_bill_id);
