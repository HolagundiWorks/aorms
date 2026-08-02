-- 0220 — Project tenders: firm issues; contractors bid via contractor portal.
-- Replaces the firm-as-bidder desk mistaken direction. Lump-sum v1 (no BOQ lines).
-- Not a restore of work-package / RA-bill award bridges from 0089.

CREATE TABLE IF NOT EXISTS esti_tender (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  scope text,
  status text NOT NULL DEFAULT 'DRAFT',
  due_date date,
  instructions text,
  awarded_contractor_id uuid REFERENCES esti_contractor(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_tender_project_idx ON esti_tender(project_id);
CREATE INDEX IF NOT EXISTS esti_tender_status_idx ON esti_tender(status);

CREATE TABLE IF NOT EXISTS esti_tender_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES esti_tender(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES esti_contractor(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'INVITED',
  invited_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_tender_invitation_tender_contractor_uq
  ON esti_tender_invitation(tender_id, contractor_id);
CREATE INDEX IF NOT EXISTS esti_tender_invitation_contractor_idx
  ON esti_tender_invitation(contractor_id);

CREATE TABLE IF NOT EXISTS esti_tender_bid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES esti_tender_invitation(id) ON DELETE CASCADE,
  amount_paise bigint NOT NULL,
  completion_weeks integer,
  technical_score double precision,
  notes text,
  submitted_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_tender_bid_invitation_uq ON esti_tender_bid(invitation_id);
