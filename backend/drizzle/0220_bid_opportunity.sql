-- 0220 — Bid desk: firm-as-bidder RFP / tender opportunities.
-- NOT contractor tendering (esti_tender* dropped in 0117).
CREATE TABLE IF NOT EXISTS esti_bid_opportunity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  title text NOT NULL,
  issuer_name text NOT NULL,
  reference_no text,
  source text NOT NULL DEFAULT 'TENDER_PORTAL',
  portal_url text,
  submission_due_at timestamptz,
  emd_paise bigint,
  estimated_fee_paise bigint,
  site_location text,
  city text,
  status text NOT NULL DEFAULT 'WATCHING',
  lead_id uuid REFERENCES esti_lead(id) ON DELETE SET NULL,
  converted_project_id uuid REFERENCES esti_projectoffice(id) ON DELETE SET NULL,
  converted_client_id uuid REFERENCES esti_client(id) ON DELETE SET NULL,
  conflict_check_done boolean NOT NULL DEFAULT false,
  conflict_check_notes text,
  loss_reason text,
  notes text,
  owner_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_bid_opportunity_status_idx ON esti_bid_opportunity(status);
CREATE INDEX IF NOT EXISTS esti_bid_opportunity_due_idx ON esti_bid_opportunity(submission_due_at);
CREATE INDEX IF NOT EXISTS esti_bid_opportunity_created_idx ON esti_bid_opportunity(created_at DESC);
