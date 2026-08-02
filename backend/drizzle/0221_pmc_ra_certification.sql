-- 0221 — AProc Wave 3: RA bill certification (owner-side).
-- PMC certifies contractor interim bills for the client — not firm revenue ERP.
-- See docs/esti/APROC-ARCHITECTURE.md.

CREATE TABLE IF NOT EXISTS esti_pmc_ra_bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  package_id uuid REFERENCES esti_pmc_package(id) ON DELETE SET NULL,
  ref text NOT NULL,
  bill_no text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  gross_paise bigint NOT NULL DEFAULT 0,
  advance_recovery_paise bigint NOT NULL DEFAULT 0,
  retention_paise bigint NOT NULL DEFAULT 0,
  other_deduction_paise bigint NOT NULL DEFAULT 0,
  other_deduction_note text,
  gst_note text,
  tds_note text,
  narrative text,
  certified_at timestamptz,
  certified_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  sent_at timestamptz,
  pdf_key text,
  pdf_status text NOT NULL DEFAULT 'NONE',
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_pmc_ra_bill_project_idx ON esti_pmc_ra_bill(project_id);
CREATE INDEX IF NOT EXISTS esti_pmc_ra_bill_status_idx ON esti_pmc_ra_bill(status);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_ra_bill_ref_uidx ON esti_pmc_ra_bill(ref);

CREATE TABLE IF NOT EXISTS esti_pmc_ra_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES esti_pmc_ra_bill(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  unit text,
  previous_qty double precision NOT NULL DEFAULT 0,
  this_qty double precision NOT NULL DEFAULT 0,
  rate_paise bigint NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_pmc_ra_line_bill_idx ON esti_pmc_ra_line(bill_id);
