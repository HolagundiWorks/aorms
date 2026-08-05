-- Local-first: metadata event log (hub) + node offline queue/cursors + artifact content hash.

ALTER TABLE esti_sync_outbox ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE esti_sync_record ADD COLUMN IF NOT EXISTS content_hash text;

CREATE TABLE IF NOT EXISTS esti_meta_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  firm_id uuid NOT NULL,
  stream text NOT NULL DEFAULT 'firm',
  seq bigint NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  op text NOT NULL DEFAULT 'UPSERT',
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflict text NOT NULL DEFAULT 'lwwField',
  actor_id text,
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS esti_meta_event_firm_stream_seq_uidx
  ON esti_meta_event (firm_id, stream, seq);

CREATE INDEX IF NOT EXISTS esti_meta_event_firm_stream_id_idx
  ON esti_meta_event (firm_id, stream, id);

CREATE TABLE IF NOT EXISTS esti_meta_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  stream text NOT NULL DEFAULT 'firm',
  entity text NOT NULL,
  entity_id text NOT NULL,
  op text NOT NULL DEFAULT 'UPSERT',
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflict text NOT NULL DEFAULT 'lwwField',
  actor_id text,
  client_updated_at timestamptz,
  state text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  remote_seq bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

CREATE INDEX IF NOT EXISTS esti_meta_outbox_state_idx ON esti_meta_outbox (state);

CREATE TABLE IF NOT EXISTS esti_meta_cursor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  stream text NOT NULL,
  last_applied_seq bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS esti_meta_cursor_stream_uidx ON esti_meta_cursor (stream);
