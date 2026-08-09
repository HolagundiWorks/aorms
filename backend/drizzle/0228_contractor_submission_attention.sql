-- Contractor portal tickets may tag a firm team member (attention to).
ALTER TABLE esti_contractor_submission
  ADD COLUMN IF NOT EXISTS attention_to_id uuid REFERENCES esti_user(id) ON DELETE SET NULL;
