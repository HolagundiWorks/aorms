-- 0223 — Project Bar Bending Schedule (consultancy checking / GFC quantities).
-- Restores esti_bbs + items without steel-reconciliation / work-package spine.
-- Geometry members feed the IS 456 cutting-length engine in @esti/contracts.

CREATE TABLE IF NOT EXISTS esti_bbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_bbs_project_idx ON esti_bbs(project_id);

CREATE TABLE IF NOT EXISTS esti_bbs_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bbs_id uuid NOT NULL REFERENCES esti_bbs(id) ON DELETE CASCADE,
  element text NOT NULL,
  mark text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_bbs_member_bbs_idx ON esti_bbs_member(bbs_id);

CREATE TABLE IF NOT EXISTS esti_bbs_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bbs_id uuid NOT NULL REFERENCES esti_bbs(id) ON DELETE CASCADE,
  member_id uuid REFERENCES esti_bbs_member(id) ON DELETE CASCADE,
  bar_mark text NOT NULL,
  member text,
  element text,
  role text,
  dia_mm double precision NOT NULL,
  no_of_members integer NOT NULL DEFAULT 1,
  bars_per_member integer NOT NULL DEFAULT 1,
  cutting_length_mm double precision NOT NULL,
  weight_kg double precision NOT NULL DEFAULT 0,
  floor text,
  shape text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_bbs_item_bbs_idx ON esti_bbs_item(bbs_id);
