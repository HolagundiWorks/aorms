-- 0225 — AStudio project moodboards (Canva-like canvas).
-- Greenfield rebuild after 0117 dropped the old esti_moodboard / esti_moodimage
-- tables. Freeform IMAGE | STICKY | PATH items for project collaboration.

CREATE TABLE IF NOT EXISTS esti_moodboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL,
  canvas_width integer NOT NULL DEFAULT 1920,
  canvas_height integer NOT NULL DEFAULT 1080,
  background text NOT NULL DEFAULT '#F2F4F7',
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_moodboard_project_idx ON esti_moodboard(project_id);

CREATE TABLE IF NOT EXISTS esti_moodboard_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moodboard_id uuid NOT NULL REFERENCES esti_moodboard(id) ON DELETE CASCADE,
  kind text NOT NULL,
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  width double precision,
  height double precision,
  rotation double precision NOT NULL DEFAULT 0,
  z_index integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_moodboard_item_board_idx ON esti_moodboard_item(moodboard_id);
CREATE INDEX IF NOT EXISTS esti_moodboard_item_z_idx ON esti_moodboard_item(moodboard_id, z_index);
