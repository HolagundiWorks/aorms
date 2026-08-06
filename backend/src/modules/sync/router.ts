import {
  FREE_DESKTOP_CAPABILITIES,
  LICENSED_DESKTOP_CAPABILITIES,
  META_STREAM_FIRM,
  MetaEventBody,
  type RuntimeCapabilities,
  WEB_PARITY_CAPABILITIES,
} from "@esti/contracts";
import { z } from "zod";
import { env } from "../../env.js";
import { licenseState } from "../../lib/plan.js";
import { getOrgSettings } from "../../lib/settings.js";
import {
  advanceMetaCursor,
  drainMetaOutbox,
  enqueueMetaEvent,
  pullMetaCatchUp,
} from "../../lib/sync/metadata.js";
import { applyDomainMetaEvents } from "../../lib/sync/domainMeta.js";
import { drainOutbox, outboxStatus } from "../../lib/sync/outbox.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

/**
 * Resolve runtime capabilities for this install (desktop node vs web/hub parity).
 * Free/unlicensed desktop keeps local AI/worker but does not sync to the hub.
 */
export async function resolveRuntimeCapabilities(
  db: Parameters<typeof licenseState>[0],
): Promise<RuntimeCapabilities> {
  const hubConfigured = Boolean(env.ESTI_HUB_URL);
  if (env.ESTI_ROLE === "hub") {
    return {
      ...WEB_PARITY_CAPABILITIES,
      host: "hub",
      localAi: true,
      localWorker: true,
      metaSync: true,
      artifactSync: true,
    };
  }

  const looksDesktop =
    Boolean(env.INSTALL_ID) || env.STORAGE_DRIVER === "fs" || env.ESTI_DESKTOP;

  if (!looksDesktop) {
    return {
      ...WEB_PARITY_CAPABILITIES,
      metaSync: hubConfigured,
      artifactSync: hubConfigured,
      localAi: true,
      localWorker: true,
    };
  }

  const lic = await licenseState(db).catch(() => null);
  const licensed = Boolean(
    lic &&
      lic.managed &&
      (lic.status === "VALID" || lic.status === "GRACE") &&
      hubConfigured,
  );
  const base = licensed ? LICENSED_DESKTOP_CAPABILITIES : FREE_DESKTOP_CAPABILITIES;
  return {
    ...base,
    localAi: true,
    localWorker: true,
    metaSync: licensed,
    artifactSync: licensed,
  };
}

/** Node-side sync controls — outbox status, flush, metadata enqueue/pull, capabilities. */
export const syncRouter = router({
  status: protectedProcedure.query(({ ctx }) => outboxStatus(ctx.db)),

  capabilities: protectedProcedure.query(({ ctx }) => resolveRuntimeCapabilities(ctx.db)),

  flush: ownerProcedure.mutation(async ({ ctx }) => {
    const artifacts = await drainOutbox(ctx.db);
    const meta = await drainMetaOutbox(ctx.db);
    return { artifacts, meta };
  }),

  /** Enqueue a metadata patch for hub push (no-op when meta sync is disabled). */
  enqueueMeta: protectedProcedure.input(MetaEventBody).mutation(async ({ ctx, input }) => {
    const caps = await resolveRuntimeCapabilities(ctx.db);
    if (!caps.metaSync) {
      return { queued: false as const, reason: "meta_sync_disabled" as const };
    }
    await enqueueMetaEvent(ctx.db, {
      ...input,
      actorId: input.actorId ?? ctx.user.id,
    });
    return { queued: true as const };
  }),

  /** Pull hub catch-up, run LF3 domain merge, advance cursor. */
  pullMeta: protectedProcedure
    .input(
      z
        .object({
          stream: z.string().default(META_STREAM_FIRM),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const stream = input?.stream ?? META_STREAM_FIRM;
      const payload = await pullMetaCatchUp(ctx.db, stream, input?.limit ?? 100);
      if (!payload) return { events: [], latestSeq: 0, stream, apply: null };
      const apply =
        payload.events.length > 0 ? applyDomainMetaEvents(payload.events).result : null;
      if (payload.events.length) {
        const last = payload.events[payload.events.length - 1]!;
        await advanceMetaCursor(ctx.db, stream, last.seq);
      } else if (payload.latestSeq > 0) {
        await advanceMetaCursor(ctx.db, stream, payload.latestSeq);
      }
      return { ...payload, apply };
    }),

  hubConfigured: protectedProcedure.query(async ({ ctx }) => {
    const { syncToken } = await getOrgSettings(ctx.db);
    const hub = env.ESTI_HUB_URL.replace(/\/+$/, "");
    return {
      hubUrl: hub || null,
      wsUrl: hub ? `${hub.replace(/^http/, "ws")}/api/sync/meta/ws` : null,
      hasSyncToken: Boolean(syncToken),
      role: env.ESTI_ROLE,
    };
  }),
});
