import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { metaEvents, projectOffices, syncRecords } from "../../db/schema.js";
import { env } from "../../env.js";
import { getFirm } from "../../lib/firm.js";
import {
  listAllOpsForFirm,
  listOpsTasksForProject,
  listPublishedArtifacts,
  mongoOpsMode,
  upsertOpsTask,
  upsertPublishedArtifact,
} from "../../lib/mongo/ops.js";
import { getOrgSettings } from "../../lib/settings.js";
import { clientProcedure, ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

async function assertOwnedProject(
  ctx: { db: DB; user: { clientId: string } },
  projectId: string,
) {
  const rows = await ctx.db
    .select({ id: projectOffices.id, clientId: projectOffices.clientId })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  const p = rows[0];
  if (!p || p.clientId !== ctx.user.clientId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

/** Mongo / memory ops — staff publish + portal read + ops DB manager. */
export const mongoOpsRouter = router({
  status: protectedProcedure.query(async () => ({
    mode: mongoOpsMode(),
  })),

  publishTask: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().min(1),
        title: z.string().min(1),
        status: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const firm = await getFirm(ctx.db);
      const now = new Date().toISOString();
      await upsertOpsTask({
        firmId: firm.id,
        projectId: input.projectId,
        taskId: input.taskId,
        title: input.title,
        status: input.status,
        updatedAt: now,
        publishedAt: now,
      });
      return { ok: true as const };
    }),

  publishDrawingPackage: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        packageId: z.string().min(1),
        title: z.string().min(1),
        drawingPackageId: z.string().optional(),
        vdbUri: z.string().optional(),
        storageKey: z.string().optional(),
        contentHash: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const firm = await getFirm(ctx.db);
      const now = new Date().toISOString();
      await upsertPublishedArtifact({
        firmId: firm.id,
        projectId: input.projectId,
        entity: "drawingPackage",
        entityId: input.packageId,
        title: input.title,
        drawingPackageId: input.drawingPackageId ?? input.packageId,
        vdbUri: input.vdbUri,
        storageKey: input.storageKey,
        contentHash: input.contentHash,
        updatedAt: now,
      });
      return { ok: true as const };
    }),

  portalTasks: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      const firm = await getFirm(ctx.db);
      return listOpsTasksForProject(firm.id, input.projectId);
    }),

  portalDrawingPackages: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      const firm = await getFirm(ctx.db);
      return listPublishedArtifacts(firm.id, input.projectId, "drawingPackage");
    }),

  adminBrowse: protectedProcedure.query(async ({ ctx }) => {
    const firm = await getFirm(ctx.db);
    return listAllOpsForFirm(firm.id);
  }),

  /**
   * Ops DB Manager — connector strip + recent hub sync/meta rows from desktop Flush.
   * Firm-scoped; firm:admin. Does not expose SQLite firm.db (LOCAL-FIRST).
   */
  adminConnectorSummary: ownerProcedure.query(async ({ ctx }) => {
    const firm = await getFirm(ctx.db);
    const { syncToken } = await getOrgSettings(ctx.db);
    const hub = env.ESTI_HUB_URL.replace(/\/+$/, "");
    const [records, events] = await Promise.all([
      ctx.db
        .select({
          id: syncRecords.id,
          entity: syncRecords.entity,
          entityId: syncRecords.entityId,
          contentHash: syncRecords.contentHash,
          updatedAt: syncRecords.updatedAt,
        })
        .from(syncRecords)
        .where(eq(syncRecords.firmId, firm.id))
        .orderBy(desc(syncRecords.updatedAt))
        .limit(40),
      ctx.db
        .select({
          id: metaEvents.id,
          entity: metaEvents.entity,
          entityId: metaEvents.entityId,
          op: metaEvents.op,
          stream: metaEvents.stream,
          seq: metaEvents.seq,
          createdAt: metaEvents.createdAt,
        })
        .from(metaEvents)
        .where(eq(metaEvents.firmId, firm.id))
        .orderBy(desc(metaEvents.seq))
        .limit(40),
    ]);

    return {
      firmId: firm.id,
      opsMode: mongoOpsMode(),
      role: env.ESTI_ROLE,
      hubUrl: hub || null,
      /** Redacted — presence only (never return the bearer). */
      hasSyncToken: Boolean(syncToken),
      /** Hub can receive desktop Flush regardless of node syncReady. */
      desktopConnectorHint:
        "Activate + Flush from AORMS Connect (or AStudio). This page browses published Mongo ops and hub sync/meta only.",
      syncRecords: records.map((r) => ({
        id: r.id,
        entity: r.entity,
        entityId: r.entityId,
        contentHash: r.contentHash,
        updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
        source: "esti_sync_record" as const,
      })),
      metaEvents: events.map((e) => ({
        id: e.id,
        entity: e.entity,
        entityId: e.entityId,
        op: e.op,
        stream: e.stream,
        seq: e.seq,
        updatedAt: e.createdAt?.toISOString?.() ?? String(e.createdAt),
        source: "esti_meta_event" as const,
      })),
    };
  }),
});
