-- 0222 — AProc deferred waves: package tender invites/bids, steel cert, package unseal.
-- Owner-side tender invitation → contractor portal sealed bids (W2.3).
-- Lightweight steel certification without BBS ERP spine (W3.3).
-- See docs/esti/APROC-ARCHITECTURE.md.

ALTER TABLE esti_pmc_package
  ADD COLUMN IF NOT EXISTS bids_opened_at timestamptz;

CREATE TABLE IF NOT EXISTS esti_pmc_package_invite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES esti_pmc_package(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES esti_contractor(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'INVITED',
  notes text,
  invited_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_package_invite_pkg_contractor_uidx
  ON esti_pmc_package_invite(package_id, contractor_id);
CREATE INDEX IF NOT EXISTS esti_pmc_package_invite_contractor_idx
  ON esti_pmc_package_invite(contractor_id);
CREATE INDEX IF NOT EXISTS esti_pmc_package_invite_package_idx
  ON esti_pmc_package_invite(package_id);

CREATE TABLE IF NOT EXISTS esti_pmc_package_bid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES esti_pmc_package(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES esti_pmc_package_invite(id) ON DELETE SET NULL,
  contractor_id uuid NOT NULL REFERENCES esti_contractor(id) ON DELETE CASCADE,
  amount_paise bigint NOT NULL,
  cover_note text,
  validity_days integer,
  status text NOT NULL DEFAULT 'SUBMITTED',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_package_bid_active_uidx
  ON esti_pmc_package_bid(package_id, contractor_id)
  WHERE status = 'SUBMITTED';
CREATE INDEX IF NOT EXISTS esti_pmc_package_bid_package_idx
  ON esti_pmc_package_bid(package_id);
CREATE INDEX IF NOT EXISTS esti_pmc_package_bid_contractor_idx
  ON esti_pmc_package_bid(contractor_id);

CREATE TABLE IF NOT EXISTS esti_pmc_steel_cert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  package_id uuid REFERENCES esti_pmc_package(id) ON DELETE SET NULL,
  ref text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  issued_kg double precision NOT NULL DEFAULT 0,
  consumed_kg double precision NOT NULL DEFAULT 0,
  wastage_pct double precision NOT NULL DEFAULT 0,
  narrative text,
  certified_at timestamptz,
  certified_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_pmc_steel_cert_project_idx ON esti_pmc_steel_cert(project_id);
CREATE INDEX IF NOT EXISTS esti_pmc_steel_cert_status_idx ON esti_pmc_steel_cert(status);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_steel_cert_ref_uidx ON esti_pmc_steel_cert(ref);
