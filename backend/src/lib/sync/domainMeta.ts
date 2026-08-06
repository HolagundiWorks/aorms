/**
 * LF3 — domain metadata enqueue + apply for hub sync.
 *
 * Domain routers call `enqueue*` after local writes. Nodes pull via
 * `sync.pullMeta`, which advances the cursor and applies patches here.
 *
 * Conflict policy comes from `SYNC_FIELD_MAP` / the event's `conflict` field
 * (`mergeMetaPatch`). Apply is best-effort — missing local rows are skipped.
 */
import {
  META_STREAM_FIRM,
  SYNC_FIELD_MAP,
  computeEstimateTotalsFromSubtotal,
  type MetaEventRecord,
} from "@esti/contracts";
import { eq, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates, phaseProgress, tasks } from "../../db/schema.js";
import { env } from "../../env.js";
import { enqueueMetaEvent, mergeMetaPatch } from "./metadata.js";

function isoNow(): string {
  return new Date().toISOString();
}

/** Best-effort: never fail the domain write if meta outbox insert fails. */
async function safeEnqueue(db: DB, body: Parameters<typeof enqueueMetaEvent>[1]): Promise<void> {
  if (env.ESTI_ROLE === "hub") return;
  try {
    await enqueueMetaEvent(db, body);
  } catch (e) {
    console.warn("domainMeta.enqueue failed:", String(e));
  }
}

export async function enqueueTaskMeta(
  db: DB,
  row: {
    id: string;
    title: string;
    status: string;
    assigneeId: string | null;
    dueDate: string | null;
    priority: string;
    projectId: string | null;
  },
  actorId?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    title: row.title,
    status: row.status,
    assigneeIds: row.assigneeId ? [row.assigneeId] : [],
    dueDate: row.dueDate,
    priority: row.priority,
    projectId: row.projectId,
    phaseId: null,
    updatedAt: isoNow(),
  };
  await safeEnqueue(db, {
    stream: META_STREAM_FIRM,
    entity: "task",
    entityId: row.id,
    op: "UPSERT",
    patch,
    conflict: SYNC_FIELD_MAP.task.conflict,
    updatedAt: isoNow(),
    actorId,
  });
}

export async function enqueueEstimateTotalsMeta(
  db: DB,
  row: {
    estimateId: string;
    projectId: string;
    subtotalPaise: number;
    contingencyPaise: number;
    gstPaise: number;
    grandTotalPaise: number;
  },
  actorId?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    estimateId: row.estimateId,
    projectId: row.projectId,
    subtotalPaise: row.subtotalPaise,
    contingencyPaise: row.contingencyPaise,
    gstPaise: row.gstPaise,
    grandTotalPaise: row.grandTotalPaise,
    updatedAt: isoNow(),
  };
  await safeEnqueue(db, {
    stream: META_STREAM_FIRM,
    entity: "estimateTotals",
    entityId: row.estimateId,
    op: "UPSERT",
    patch,
    conflict: SYNC_FIELD_MAP.estimateTotals.conflict,
    updatedAt: isoNow(),
    actorId,
  });
}

export async function enqueuePhaseProgressMeta(
  db: DB,
  row: {
    id: string;
    projectId: string;
    phaseId: string;
    status: string;
    pctComplete?: number | null;
  },
  actorId?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    projectId: row.projectId,
    phaseId: row.phaseId,
    status: row.status,
    pctComplete: row.pctComplete ?? (row.status === "COMPLETE" ? 100 : 0),
    updatedAt: isoNow(),
  };
  await safeEnqueue(db, {
    stream: META_STREAM_FIRM,
    entity: "phaseProgress",
    entityId: row.id,
    op: "UPSERT",
    patch,
    conflict: SYNC_FIELD_MAP.phaseProgress.conflict,
    updatedAt: isoNow(),
    actorId,
  });
}

async function applyTaskEvent(db: DB, event: MetaEventRecord): Promise<boolean> {
  if (event.op === "DELETE") return false;
  const [current] = await db.select().from(tasks).where(eq(tasks.id, event.entityId)).limit(1);
  if (!current) return false;
  const merged = mergeMetaPatch(
    {
      title: current.title,
      status: current.status,
      assigneeId: current.assigneeId,
      dueDate: current.dueDate,
      priority: current.priority,
      projectId: current.projectId,
      updatedAt: current.updatedAt instanceof Date ? current.updatedAt.toISOString() : undefined,
    },
    event,
  );
  const assigneeIds = merged.assigneeIds;
  const assigneeId =
    Array.isArray(assigneeIds) && typeof assigneeIds[0] === "string"
      ? assigneeIds[0]
      : typeof merged.assigneeId === "string"
        ? merged.assigneeId
        : current.assigneeId;
  await db
    .update(tasks)
    .set({
      ...(typeof merged.title === "string" ? { title: merged.title } : {}),
      ...(typeof merged.status === "string" ? { status: merged.status as typeof current.status } : {}),
      assigneeId,
      ...(merged.dueDate === null || typeof merged.dueDate === "string"
        ? { dueDate: (merged.dueDate as string | null) ?? null }
        : {}),
      ...(typeof merged.priority === "string"
        ? { priority: merged.priority as typeof current.priority }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, event.entityId));
  return true;
}

async function applyEstimateTotalsEvent(_db: DB, _event: MetaEventRecord): Promise<boolean> {
  // Totals are derived from line items locally — meta patch is peer awareness only.
  // Cursor still advances; we do not rewrite contingency/GST from hub.
  return true;
}

async function applyPhaseProgressEvent(db: DB, event: MetaEventRecord): Promise<boolean> {
  if (event.op === "DELETE") return false;
  const [current] = await db
    .select()
    .from(phaseProgress)
    .where(eq(phaseProgress.id, event.entityId))
    .limit(1);
  if (!current) return false;
  const merged = mergeMetaPatch(
    {
      status: current.status,
      updatedAt: current.updatedAt instanceof Date ? current.updatedAt.toISOString() : undefined,
    },
    event,
  );
  if (typeof merged.status !== "string") return false;
  const status = merged.status as typeof current.status;
  await db
    .update(phaseProgress)
    .set({
      status,
      completedAt: status === "COMPLETE" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(phaseProgress.id, event.entityId));
  return true;
}

/** Apply a batch of hub metadata events to local domain tables. */
export async function applyDomainMetaEvents(
  db: DB,
  events: MetaEventRecord[],
): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;
  for (const event of events) {
    try {
      let ok = false;
      switch (event.entity) {
        case "task":
        case "taskStatus":
          ok = await applyTaskEvent(db, event);
          break;
        case "estimateTotals":
          ok = await applyEstimateTotalsEvent(db, event);
          break;
        case "phaseProgress":
          ok = await applyPhaseProgressEvent(db, event);
          break;
        default:
          ok = false;
      }
      if (ok) applied++;
      else skipped++;
    } catch (e) {
      console.warn(`domainMeta.apply(${event.entity}/${event.entityId}) failed:`, String(e));
      skipped++;
    }
  }
  return { applied, skipped };
}

/** Recompute + enqueue estimate totals for one estimate id. */
export async function enqueueEstimateTotalsForId(
  db: DB,
  estimateId: string,
  actorId?: string,
): Promise<void> {
  const [est] = await db.select().from(estimates).where(eq(estimates.id, estimateId)).limit(1);
  if (!est) return;
  const [sum] = await db
    .select({
      subtotal: sql<number>`coalesce(sum(${estimateItems.amountPaise}), 0)::bigint`,
    })
    .from(estimateItems)
    .where(eq(estimateItems.estimateId, estimateId));
  const t = computeEstimateTotalsFromSubtotal(
    Number(sum?.subtotal ?? 0),
    est.contingencyPct,
    est.gstPct,
  );
  await enqueueEstimateTotalsMeta(
    db,
    {
      estimateId: est.id,
      projectId: est.projectId,
      subtotalPaise: t.itemsSubtotalPaise,
      contingencyPaise: t.contingencyPaise,
      gstPaise: t.gstPaise,
      grandTotalPaise: t.grandTotalPaise,
    },
    actorId,
  );
}
