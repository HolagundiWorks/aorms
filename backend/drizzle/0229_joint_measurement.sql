-- Joint measurement recorder (site supervisor) → approval → measurement book / rate books.
CREATE TABLE IF NOT EXISTS esti_joint_measurement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES esti_contractor(id) ON DELETE SET NULL,
  source_submission_id uuid REFERENCES esti_contractor_submission(id) ON DELETE SET NULL,
  subject text NOT NULL,
  measured_on date,
  details text,
  status text NOT NULL DEFAULT 'DRAFT',
  attention_to_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  submitted_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  reviewed_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS esti_joint_measurement_project_idx
  ON esti_joint_measurement (project_id);
CREATE INDEX IF NOT EXISTS esti_joint_measurement_status_idx
  ON esti_joint_measurement (status);

CREATE TABLE IF NOT EXISTS esti_joint_measurement_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  joint_measurement_id uuid NOT NULL REFERENCES esti_joint_measurement(id) ON DELETE CASCADE,
  code text,
  description text NOT NULL,
  uom text NOT NULL,
  measure_kind text NOT NULL DEFAULT 'LBH',
  length_mm integer,
  breadth_mm integer,
  height_mm integer,
  count_nos double precision NOT NULL DEFAULT 1,
  quantity double precision NOT NULL DEFAULT 0,
  item_library_item_id uuid REFERENCES esti_item_library_item(id) ON DELETE SET NULL,
  drawing_id uuid REFERENCES esti_drawing(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS esti_joint_measurement_line_jm_idx
  ON esti_joint_measurement_line (joint_measurement_id);

CREATE TABLE IF NOT EXISTS esti_joint_measurement_annotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  joint_measurement_id uuid NOT NULL REFERENCES esti_joint_measurement(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES esti_drawing(id) ON DELETE CASCADE,
  tool text NOT NULL,
  page_no integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#FF4F18',
  label text,
  geometry jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS esti_joint_measurement_ann_jm_idx
  ON esti_joint_measurement_annotation (joint_measurement_id);
