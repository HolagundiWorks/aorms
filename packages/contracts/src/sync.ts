import { z } from "zod";

/**
 * Local-first + cloud hub sync.
 *
 * Three planes (keep separate or bandwidth goals collapse):
 * - **Work / localOnly** — drafts, measurements, AI chats; never leave the machine until promote
 * - **Metadata** — compact shared fields (tasks, status, cost scalars, progress); realtime via hub event log
 * - **Artifacts** — finalized docs/PDFs; Phase B outbox → hub ingest only on explicit finalize
 *
 * A **node** (native desktop app) holds the working store; the **hub** is the
 * realtime metadata authority and the published-artifact store for firm portals.
 * Staff web parity SPA is retired as a product surface (desktop-native pivot).
 */

// ─── Planes & classification ─────────────────────────────────────────────────

export const SyncPlane = z.enum(["localOnly", "metadata", "artifact"]);
export type SyncPlane = z.infer<typeof SyncPlane>;

/**
 * Publishable artifact entity kinds (each keyed by its "finalized" status).
 * Transport: transactional outbox on the node + authenticated ingest on the hub.
 */
export const SyncEntity = z.enum([
  "drawing", // status READY
  "transmittal", // dateIssued set
  "invoice", // ISSUED / PAID
  "approval", // != DRAFT
  "tender", // AWARDED
  "runningBill", // approved-measurement-sent onward
  "inspection", // ISSUED
  "siteVisit", // CONFIRMED
  "siteReference", // frozen feasibility + programme snapshot
  "progressReport", // ISSUED to client
  "jointMeasurement", // APPROVED abstract (site JM → office)
]);
export type SyncEntity = z.infer<typeof SyncEntity>;

/** Compact metadata entity kinds synced through the hub event log (not file bytes). */
export const MetaEntity = z.enum([
  "task",
  "taskStatus",
  "estimateTotals",
  "phaseProgress",
  "invoiceStatus",
  "drawingRegister",
  "approvalState",
  "projectStatus",
  "presence",
]);
export type MetaEntity = z.infer<typeof MetaEntity>;

export const SyncOp = z.enum(["UPSERT", "DELETE"]);
export type SyncOp = z.infer<typeof SyncOp>;

export const SyncState = z.enum(["PENDING", "SYNCED", "FAILED"]);
export type SyncState = z.infer<typeof SyncState>;

/** Conflict policy applied when merging metadata patches. */
export const MetaConflictPolicy = z.enum([
  /** Last-writer-wins per field using `updatedAt` (+ actor tie-break). */
  "lwwField",
  /** Hub sequence wins — used for derived money/progress scalars. */
  "serverSeq",
]);
export type MetaConflictPolicy = z.infer<typeof MetaConflictPolicy>;

/**
 * Field-level sync map: which plane a domain concept rides, and how conflicts resolve.
 * Size rule of thumb: &lt;2 KB + changes often → metadata; files / nested BOQ → local until artifact.
 */
export const SYNC_FIELD_MAP = {
  task: {
    plane: "metadata" as const,
    entity: "task" as const,
    conflict: "lwwField" as const,
    fields: ["title", "status", "assigneeIds", "dueDate", "priority", "projectId", "phaseId"],
  },
  estimateTotals: {
    plane: "metadata" as const,
    entity: "estimateTotals" as const,
    conflict: "serverSeq" as const,
    fields: ["estimateId", "projectId", "subtotalPaise", "contingencyPaise", "gstPaise", "grandTotalPaise"],
  },
  estimateLines: {
    plane: "localOnly" as const,
    note: "BOQ lines + measurement book stay local until estimate is finalized/published",
  },
  phaseProgress: {
    plane: "metadata" as const,
    entity: "phaseProgress" as const,
    conflict: "serverSeq" as const,
    fields: ["projectId", "phaseId", "pctComplete", "status"],
  },
  invoiceStatus: {
    plane: "metadata" as const,
    entity: "invoiceStatus" as const,
    conflict: "lwwField" as const,
    fields: ["invoiceId", "status", "projectId", "clientId"],
  },
  invoicePdf: {
    plane: "artifact" as const,
    entity: "invoice" as const,
    note: "PDF bytes + portal DTO via SyncEntity outbox on Issue",
  },
  drawingRegister: {
    plane: "metadata" as const,
    entity: "drawingRegister" as const,
    conflict: "lwwField" as const,
    fields: ["drawingId", "ref", "title", "status", "revNo", "projectId"],
  },
  drawingFile: {
    plane: "artifact" as const,
    entity: "drawing" as const,
    note: "CAD/PDF files publish only when status READY",
  },
  aiChat: {
    plane: "localOnly" as const,
    note: "Ask ESTI / Studio AI transcripts never sync",
  },
  measurementScratch: {
    plane: "localOnly" as const,
    note: "Plan markup / takeoff scratch stays on the node",
  },
} as const;

export type SyncFieldMapKey = keyof typeof SYNC_FIELD_MAP;

/** Classify a SyncEntity / MetaEntity / known local concept into a plane. */
export function syncPlaneFor(kind: SyncEntity | MetaEntity | SyncFieldMapKey): SyncPlane {
  if (kind in SYNC_FIELD_MAP) {
    return SYNC_FIELD_MAP[kind as SyncFieldMapKey].plane;
  }
  if (MetaEntity.safeParse(kind).success) return "metadata";
  if (SyncEntity.safeParse(kind).success) return "artifact";
  return "localOnly";
}

// ─── Artifact ingest (Phase B outbox) ────────────────────────────────────────

/** The body a node POSTs to the hub `/api/sync/ingest` for one record. */
export const SyncIngestBody = z.object({
  entity: SyncEntity,
  entityId: z.string().min(1),
  op: SyncOp.default("UPSERT"),
  payload: z.record(z.string(), z.unknown()).default({}),
  fileKeys: z.array(z.string()).default([]),
  /** Optional content hash of mirrored file bytes — hub skips re-copy when unchanged. */
  contentHash: z.string().min(1).optional(),
});
export type SyncIngestBody = z.infer<typeof SyncIngestBody>;

/** Outbox counts surfaced to the office UI. */
export const SyncStatusView = z.object({
  pending: z.number().int(),
  synced: z.number().int(),
  failed: z.number().int(),
  hubConfigured: z.boolean(),
  /** Pending metadata events waiting to flush to the hub (node). */
  metaPending: z.number().int().default(0),
  /** Last hub metadata sequence applied locally (node), if known. */
  metaLastSeq: z.number().int().nullable().default(null),
});
export type SyncStatusView = z.infer<typeof SyncStatusView>;

// ─── Metadata event log (realtime hub channel) ───────────────────────────────

/** Default stream id = firm-wide shared metadata. */
export const META_STREAM_FIRM = "firm";

export const MetaEventPatch = z.record(z.string(), z.unknown());
export type MetaEventPatch = z.infer<typeof MetaEventPatch>;

/** One append to the hub's durable metadata log. */
export const MetaEventBody = z.object({
  stream: z.string().min(1).default(META_STREAM_FIRM),
  entity: MetaEntity,
  entityId: z.string().min(1),
  op: SyncOp.default("UPSERT"),
  patch: MetaEventPatch.default({}),
  /** Client-side wall clock for LWW fields (ISO). Hub still assigns `seq`. */
  updatedAt: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  conflict: MetaConflictPolicy.default("lwwField"),
});
export type MetaEventBody = z.infer<typeof MetaEventBody>;

/** Hub-assigned durable event returned to clients. */
export const MetaEventRecord = MetaEventBody.extend({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  seq: z.number().int().positive(),
  createdAt: z.string().min(1),
});
export type MetaEventRecord = z.infer<typeof MetaEventRecord>;

/** Catch-up query: events with seq &gt; afterSeq, ordered ascending. */
export const MetaCatchUpQuery = z.object({
  stream: z.string().min(1).default(META_STREAM_FIRM),
  afterSeq: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type MetaCatchUpQuery = z.infer<typeof MetaCatchUpQuery>;

export const MetaCatchUpResponse = z.object({
  stream: z.string(),
  events: z.array(MetaEventRecord),
  latestSeq: z.number().int().nonnegative(),
});
export type MetaCatchUpResponse = z.infer<typeof MetaCatchUpResponse>;

/** WebSocket client → hub control frames. */
export const MetaWsSubscribe = z.object({
  type: z.literal("subscribe"),
  stream: z.string().min(1).default(META_STREAM_FIRM),
  afterSeq: z.number().int().nonnegative().default(0),
});
export type MetaWsSubscribe = z.infer<typeof MetaWsSubscribe>;

export const MetaWsClientMessage = z.discriminatedUnion("type", [
  MetaWsSubscribe,
  z.object({ type: z.literal("ping") }),
]);
export type MetaWsClientMessage = z.infer<typeof MetaWsClientMessage>;

/** Hub → client frames. */
export const MetaWsServerMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("event"), event: MetaEventRecord }),
  z.object({ type: z.literal("catchup"), payload: MetaCatchUpResponse }),
  z.object({ type: z.literal("pong") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type MetaWsServerMessage = z.infer<typeof MetaWsServerMessage>;

// ─── Runtime capabilities (web parity / desktop) ─────────────────────────────

/**
 * Shared feature matrix for desktop node vs cloud web. Screens share contracts;
 * offline-only capabilities degrade on web rather than diverging.
 */
export const RuntimeHost = z.enum(["desktop", "web", "hub"]);
export type RuntimeHost = z.infer<typeof RuntimeHost>;

export const RuntimeCapabilities = z.object({
  host: RuntimeHost,
  /** Local Ollama / EOMS available on this host. */
  localAi: z.boolean(),
  /** Heavy PDF/DXF/reconcile worker on this host. */
  localWorker: z.boolean(),
  /** Realtime metadata channel connected to hub. */
  metaSync: z.boolean(),
  /** Artifact outbox → hub configured. */
  artifactSync: z.boolean(),
  /** Staff SPA can author while offline (desktop). */
  offlineAuthoring: z.boolean(),
});
export type RuntimeCapabilities = z.infer<typeof RuntimeCapabilities>;

/** Free / unlicensed desktop: local work only; no hub metadata or artifact push. */
export const FREE_DESKTOP_CAPABILITIES: RuntimeCapabilities = {
  host: "desktop",
  localAi: true,
  localWorker: true,
  metaSync: false,
  artifactSync: false,
  offlineAuthoring: true,
};

/** Licensed desktop node bound to a hub. */
export const LICENSED_DESKTOP_CAPABILITIES: RuntimeCapabilities = {
  host: "desktop",
  localAi: true,
  localWorker: true,
  metaSync: true,
  artifactSync: true,
  offlineAuthoring: true,
};

/** Cloud web staff SPA (parity path) — AI/worker on hub or BYO. */
export const WEB_PARITY_CAPABILITIES: RuntimeCapabilities = {
  host: "web",
  localAi: false,
  localWorker: false,
  metaSync: true,
  artifactSync: true,
  offlineAuthoring: false,
};
