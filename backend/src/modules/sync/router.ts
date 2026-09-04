import { META_STREAM_FIRM, MetaEventBody } from "@esti/contracts";
import { z } from "zod";
import { env } from "../../env.js";
import { getOrgSettings } from "../../lib/settings.js";
import { applyDomainMetaEvents } from "../../lib/sync/domainMeta.js";
import {
  advanceMetaCursor,
  drainMetaOutbox,
  enqueueMetaEvent,
  pullMetaCatchUp,
} from "../../lib/sync/metadata.js";
import { drainOutbox, outboxStatus } from "../../lib/sync/outbox.js";
import { resolveRuntimeCapabilities } from "../../lib/sync/runtimeCapabilities.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export { resolveRuntimeCapabilities } from "../../lib/sync/runtimeCapabilities.js";

/** Node-side sync controls — outbox status, flush, metadata enqueue/pull, capabilities. */
export const syncRouter = router({
  status: protectedProcedure.query(({ ctx }) => outboxStatus(ctx.db)),

  capabilities: protectedProcedure.query(({ ctx }) => resolveRuntimeCapabilities(ctx.db)),

  /**
   * Drain artifact + meta outboxes to the hub.
   * No-op (zeros) when `ESTI_ROLE!=node`, hub URL empty, or syncToken missing.
   */
  flush: ownerProcedure.mutation(async ({ ctx }) => {
    const caps = await resolveRuntimeCapabilities(ctx.db);
    if (!caps.metaSync && !caps.artifactSync) {
      return {
        artifacts: { sent: 0, failed: 0 },
        meta: { sent: 0, failed: 0 },
        skipped: "sync_disabled" as const,
      };
    }
    const artifacts = caps.artifactSync
      ? await drainOutbox(ctx.db)
      : { sent: 0, failed: 0 };
    const meta = caps.metaSync ? await drainMetaOutbox(ctx.db) : { sent: 0, failed: 0 };
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

  /**
   * Pull hub catch-up, apply LF3 domain patches (task / estimateTotals / phaseProgress),
   * then advance the local cursor. Returns empty when hub/syncToken unavailable.
   */
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
      const caps = await resolveRuntimeCapabilities(ctx.db);
      if (!caps.metaSync) {
        return { events: [], latestSeq: 0, stream, applied: 0, skipped: 0 };
      }
      let payload: Awaited<ReturnType<typeof pullMetaCatchUp>>;
      try {
        payload = await pullMetaCatchUp(ctx.db, stream, input?.limit ?? 100);
      } catch (e) {
        // Hub unreachable / 401 — surface empty rather than failing the SPA tick.
        console.warn("sync.pullMeta catch-up failed:", String(e));
        return { events: [], latestSeq: 0, stream, applied: 0, skipped: 0, error: "hub_unreachable" as const };
      }
      if (!payload) return { events: [], latestSeq: 0, stream, applied: 0, skipped: 0 };
      const apply = await applyDomainMetaEvents(ctx.db, payload.events);
      if (payload.events.length) {
        const last = payload.events[payload.events.length - 1]!;
        await advanceMetaCursor(ctx.db, stream, last.seq);
      } else if (payload.latestSeq > 0) {
        await advanceMetaCursor(ctx.db, stream, payload.latestSeq);
      }
      return { ...payload, applied: apply.applied, skipped: apply.skipped };
    }),

  hubConfigured: protectedProcedure.query(async ({ ctx }) => {
    const { syncToken } = await getOrgSettings(ctx.db);
    const hub = env.ESTI_HUB_URL.replace(/\/+$/, "");
    return {
      hubUrl: hub || null,
      /** License Manager base (`…/platform`) — distinct from sync hub origin. */
      licenseApiUrl: env.ESTI_LICENSE_API_URL.replace(/\/+$/, "") || null,
      wsUrl: hub ? `${hub.replace(/^http/, "ws")}/api/sync/meta/ws` : null,
      hasSyncToken: Boolean(syncToken),
      role: env.ESTI_ROLE,
      /** Ready for morning bind: hub URL + sync bearer both present. */
      syncReady: Boolean(hub && syncToken),
    };
  }),
});
