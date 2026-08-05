import {
  bigint,
  createdAt,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  updatedAt,
  uuid,
} from "./_helpers.js";

/**
 * Local-first + cloud hub sync.
 *
 * `esti_sync_outbox` (node) — finalized artifacts enqueue here; drainer pushes to hub.
 * `esti_sync_record` (hub) — per-firm published artifacts portals / web parity read.
 * `esti_meta_event` (hub) — append-only metadata log (tasks, totals, progress scalars).
 * `esti_meta_outbox` (node) — offline queue of metadata patches awaiting hub append.
 * `esti_meta_cursor` (node) — last applied hub seq per stream.
 */
export const syncOutbox = pgTable("esti_sync_outbox", {
  id: id(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  op: text("op").notNull().default("UPSERT"),
  payload: jsonb("payload").notNull().default({}),
  fileKeys: jsonb("file_keys").notNull().default([]),
  contentHash: text("content_hash"),
  state: text("state").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  remoteId: text("remote_id"),
  createdAt: createdAt(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const syncRecords = pgTable(
  "esti_sync_record",
  {
    id: id(),
    firmId: uuid("firm_id").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    fileKeys: jsonb("file_keys").notNull().default([]),
    contentHash: text("content_hash"),
    updatedAt: updatedAt(),
    createdAt: createdAt(),
  },
  (t) => ({
    uniq: uniqueIndex("esti_sync_record_uniq").on(t.firmId, t.entity, t.entityId),
  }),
);

export const metaEvents = pgTable(
  "esti_meta_event",
  {
    id: id(),
    firmId: uuid("firm_id").notNull(),
    stream: text("stream").notNull().default("firm"),
    seq: bigint("seq", { mode: "number" }).notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    op: text("op").notNull().default("UPSERT"),
    patch: jsonb("patch").notNull().default({}),
    conflict: text("conflict").notNull().default("lwwField"),
    actorId: text("actor_id"),
    clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    streamSeqUidx: uniqueIndex("esti_meta_event_firm_stream_seq_uidx").on(
      t.firmId,
      t.stream,
      t.seq,
    ),
  }),
);

/** Node-side pending metadata pushes (offline queue). */
export const metaOutbox = pgTable("esti_meta_outbox", {
  id: id(),
  stream: text("stream").notNull().default("firm"),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  op: text("op").notNull().default("UPSERT"),
  patch: jsonb("patch").notNull().default({}),
  conflict: text("conflict").notNull().default("lwwField"),
  actorId: text("actor_id"),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }),
  state: text("state").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  remoteSeq: bigint("remote_seq", { mode: "number" }),
  createdAt: createdAt(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

/** Node-side cursor: last hub seq applied for a stream. */
export const metaCursors = pgTable(
  "esti_meta_cursor",
  {
    id: id(),
    stream: text("stream").notNull(),
    lastAppliedSeq: bigint("last_applied_seq", { mode: "number" }).notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => ({
    streamUidx: uniqueIndex("esti_meta_cursor_stream_uidx").on(t.stream),
  }),
);
