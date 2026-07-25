-- 0220 — AProc Wave 2: master programme milestones + package register.
-- Client-side governance (not contractor CPM / work-package ERP).
-- See docs/esti/APROC-ARCHITECTURE.md.

CREATE TABLE IF NOT EXISTS esti_pmc_milestone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  ref text NOT NULL,
  title text NOT NULL,
  planned_date date,
  actual_date date,
  percent_complete integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PLANNED',
  baseline_ref text,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_pmc_milestone_project_idx ON esti_pmc_milestone(project_id);
CREATE INDEX IF NOT EXISTS esti_pmc_milestone_status_idx ON esti_pmc_milestone(status);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_milestone_ref_uidx ON esti_pmc_milestone(ref);

CREATE TABLE IF NOT EXISTS esti_pmc_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  ref text NOT NULL,
  title text NOT NULL,
  trade text,
  status text NOT NULL DEFAULT 'DRAFT',
  contractor_id uuid REFERENCES esti_contractor(id) ON DELETE SET NULL,
  contract_value_paise bigint,
  tender_close_date date,
  award_date date,
  notes text,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_pmc_package_project_idx ON esti_pmc_package(project_id);
CREATE INDEX IF NOT EXISTS esti_pmc_package_status_idx ON esti_pmc_package(status);
CREATE UNIQUE INDEX IF NOT EXISTS esti_pmc_package_ref_uidx ON esti_pmc_package(ref);
