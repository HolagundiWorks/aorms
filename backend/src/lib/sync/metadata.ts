import {
  META_STREAM_FIRM,
  type MetaCatchUpResponse,
  type MetaEventBody,
  type MetaEventRecord,
  type MetaConflictPolicy,
} from "@esti/contracts";
import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { metaCursors, metaEvents, metaOutbox } from "../../db/schema.js";
import { env } from "../../env.js";
import { getOrgSettings } from "../settings.js";

const MAX_ATTEMPTS = 5;
const BATCH = 100;

type HubListener = (firmId: string, event: MetaEventRecord) => void;
const listeners = new Set<HubListener>();

/** Subscribe to in-process hub metadata broadcasts (WebSocket fan-out). */
export function onMetaEvent(listener: HubListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toRecord(row: {
  id: string;
  firmId: string;
  stream: string;
  seq: number;
  entity: string;
  entityId: string;
  op: string;
  patch: unknown;
  conflict: string;
  actorId: string | null;
  clientUpdatedAt: Date | null;
  createdAt: Date;
}): MetaEventRecord {
  return {
    id: row.id,
    firmId: row.firmId,
    stream: row.stream,
    seq: row.seq,
    entity: row.entity as MetaEventRecord["entity"],
    entityId: row.entityId,
    op: row.op as MetaEventRecord["op"],
    patch: (row.patch ?? {}) as Record<string, unknown>,
    conflict: row.conflict as MetaConflictPolicy,
    actorId: row.actorId ?? undefined,
    updatedAt: row.clientUpdatedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Hub: append one metadata event; assigns the next seq for (firm, stream). */
export async function appendMetaEvent(
  db: DB,
  firmId: string,
  body: MetaEventBody,
): Promise<MetaEventRecord> {
  const stream = body.stream || META_STREAM_FIRM;
  const [seqRow] = await db
    .select({ max: sql<number>`coalesce(max(${metaEvents.seq}), 0)::bigint` })
    .from(metaEvents)
    .where(and(eq(metaEvents.firmId, firmId), eq(metaEvents.stream, stream)));
  const nextSeq = Number(seqRow?.max ?? 0) + 1;

  const [created] = await db
    .insert(metaEvents)
    .values({
      firmId,
      stream,
      seq: nextSeq,
      entity: body.entity,
      entityId: body.entityId,
      op: body.op ?? "UPSERT",
      patch: body.patch ?? {},
      conflict: body.conflict ?? "lwwField",
      actorId: body.actorId ?? null,
      clientUpdatedAt: body.updatedAt ? new Date(body.updatedAt) : null,
    })
    .returning();

  const record = toRecord(created!);
  for (const l of listeners) {
    try {
      l(firmId, record);
    } catch {
      /* fan-out must not break append */
    }
  }
  return record;
}

/** Hub: catch-up events with seq > afterSeq. */
export async function catchUpMetaEvents(
  db: DB,
  firmId: string,
  stream: string,
  afterSeq: number,
  limit: number,
): Promise<MetaCatchUpResponse> {
  const s = stream || META_STREAM_FIRM;
  const rows = await db
    .select()
    .from(metaEvents)
    .where(
      and(eq(metaEvents.firmId, firmId), eq(metaEvents.stream, s), gt(metaEvents.seq, afterSeq)),
    )
    .orderBy(asc(metaEvents.seq))
    .limit(limit);

  const [latest] = await db
    .select({ max: sql<number>`coalesce(max(${metaEvents.seq}), 0)::bigint` })
    .from(metaEvents)
    .where(and(eq(metaEvents.firmId, firmId), eq(metaEvents.stream, s)));

  return {
    stream: s,
    events: rows.map(toRecord),
    latestSeq: Number(latest?.max ?? 0),
  };
}

/**
 * Node: enqueue a local metadata mutation for hub push (survives offline).
 * Prefer this over calling the hub directly from mutations.
 */
export async function enqueueMetaEvent(
  db: DB,
  body: MetaEventBody,
): Promise<void> {
  await db.insert(metaOutbox).values({
    stream: body.stream || META_STREAM_FIRM,
    entity: body.entity,
    entityId: body.entityId,
    op: body.op ?? "UPSERT",
    patch: body.patch ?? {},
    conflict: body.conflict ?? "lwwField",
    actorId: body.actorId ?? null,
    clientUpdatedAt: body.updatedAt ? new Date(body.updatedAt) : new Date(),
  });
}

/** Node: flush meta outbox → hub `/api/sync/meta`. */
export async function drainMetaOutbox(db: DB): Promise<{ sent: number; failed: number }> {
  if (env.ESTI_ROLE !== "node" || !env.ESTI_HUB_URL) return { sent: 0, failed: 0 };
  const { syncToken } = await getOrgSettings(db);
  if (!syncToken) return { sent: 0, failed: 0 };
  const base = env.ESTI_HUB_URL.replace(/\/+$/, "");

  const rows = await db
    .select()
    .from(metaOutbox)
    .where(and(ne(metaOutbox.state, "SYNCED"), lt(metaOutbox.attempts, MAX_ATTEMPTS)))
    .orderBy(asc(metaOutbox.createdAt))
    .limit(BATCH);

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const res = await fetch(`${base}/api/sync/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${syncToken}` },
        body: JSON.stringify({
          stream: row.stream,
          entity: row.entity,
          entityId: row.entityId,
          op: row.op,
          patch: row.patch,
          conflict: row.conflict,
          actorId: row.actorId ?? undefined,
          updatedAt: row.clientUpdatedAt?.toISOString(),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`hub responded ${res.status}`);
      const data = (await res.json()) as { event?: MetaEventRecord };
      await db
        .update(metaOutbox)
        .set({
          state: "SYNCED",
          remoteSeq: data.event?.seq ?? null,
          syncedAt: new Date(),
          lastError: null,
        })
        .where(eq(metaOutbox.id, row.id));
      sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      await db
        .update(metaOutbox)
        .set({
          state: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          attempts,
          lastError: String(e),
        })
        .where(eq(metaOutbox.id, row.id));
      failed++;
    }
  }
  return { sent, failed };
}

/** Node: pull catch-up from hub and advance local cursor (apply hook is caller's job). */
export async function pullMetaCatchUp(
  db: DB,
  stream = META_STREAM_FIRM,
  limit = 100,
): Promise<MetaCatchUpResponse | null> {
  if (env.ESTI_ROLE !== "node" || !env.ESTI_HUB_URL) return null;
  const { syncToken } = await getOrgSettings(db);
  if (!syncToken) return null;

  const [cursor] = await db
    .select()
    .from(metaCursors)
    .where(eq(metaCursors.stream, stream))
    .limit(1);
  const afterSeq = cursor?.lastAppliedSeq ?? 0;

  const base = env.ESTI_HUB_URL.replace(/\/+$/, "");
  const url = new URL(`${base}/api/sync/meta/catch-up`);
  url.searchParams.set("stream", stream);
  url.searchParams.set("afterSeq", String(afterSeq));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${syncToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`hub catch-up ${res.status}`);
  return (await res.json()) as MetaCatchUpResponse;
}

/** Node: mark events through `seq` as applied for a stream. */
export async function advanceMetaCursor(db: DB, stream: string, seq: number): Promise<void> {
  const [existing] = await db
    .select()
    .from(metaCursors)
    .where(eq(metaCursors.stream, stream))
    .limit(1);
  if (existing) {
    if (seq <= existing.lastAppliedSeq) return;
    await db
      .update(metaCursors)
      .set({ lastAppliedSeq: seq, updatedAt: new Date() })
      .where(eq(metaCursors.id, existing.id));
    return;
  }
  await db.insert(metaCursors).values({ stream, lastAppliedSeq: seq });
}

export async function metaOutboxPendingCount(db: DB): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(metaOutbox)
    .where(eq(metaOutbox.state, "PENDING"));
  return row?.n ?? 0;
}

export async function metaLastAppliedSeq(db: DB, stream = META_STREAM_FIRM): Promise<number | null> {
  const [cursor] = await db
    .select()
    .from(metaCursors)
    .where(eq(metaCursors.stream, stream))
    .limit(1);
  return cursor ? cursor.lastAppliedSeq : null;
}

/**
 * Apply LWW / serverSeq merge into a local patch target.
 * Returns the merged object (does not write DB — domain routers decide persistence).
 */
export function mergeMetaPatch(
  current: Record<string, unknown>,
  incoming: MetaEventRecord,
): Record<string, unknown> {
  if (incoming.op === "DELETE") return {};
  if (incoming.conflict === "serverSeq") {
    return { ...current, ...incoming.patch };
  }
  // lwwField: prefer incoming when its updatedAt is newer or equal
  const curTs = typeof current.updatedAt === "string" ? Date.parse(current.updatedAt) : 0;
  const inTs = incoming.updatedAt ? Date.parse(incoming.updatedAt) : Date.parse(incoming.createdAt);
  if (inTs >= curTs) return { ...current, ...incoming.patch, updatedAt: incoming.updatedAt ?? incoming.createdAt };
  return current;
}

/** Latest hub event seq for a firm stream (hub only). */
export async function latestMetaSeq(db: DB, firmId: string, stream = META_STREAM_FIRM): Promise<number> {
  const [latest] = await db
    .select({ max: sql<number>`coalesce(max(${metaEvents.seq}), 0)::bigint` })
    .from(metaEvents)
    .where(and(eq(metaEvents.firmId, firmId), eq(metaEvents.stream, stream)));
  return Number(latest?.max ?? 0);
}
