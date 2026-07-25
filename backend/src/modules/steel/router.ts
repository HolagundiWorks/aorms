import {
  SteelReconCreate,
  SteelReconFinalize,
  SteelReconLineInput,
  SteelReconLineRemove,
  SteelReconLineUpdate,
  SteelReconSeedFromBbs,
  bbsDiameterSummary,
  steelReconTotals,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  bbsItems,
  bbsSchedules,
  steelReconciliationItems,
  steelReconciliations,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const author = capabilityProcedure("write");
const approver = capabilityProcedure("cost:approve");

const round2 = (n: number) => Number(n.toFixed(2));

async function loadReconOr404(db: DB, id: string) {
  const [row] = await db.select().from(steelReconciliations).where(eq(steelReconciliations.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

function assertDraft(status: string) {
  if (status !== "DRAFT") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "A finalized steel reconciliation can no longer be changed.",
    });
  }
}

async function loadLines(db: DB, reconciliationId: string) {
  return db
    .select()
    .from(steelReconciliationItems)
    .where(eq(steelReconciliationItems.reconciliationId, reconciliationId))
    .orderBy(asc(steelReconciliationItems.diaMm));
}

async function recomputeTotals(db: DB, reconciliationId: string) {
  const lines = await loadLines(db, reconciliationId);
  const totals = steelReconTotals(lines);
  await db
    .update(steelReconciliations)
    .set({
      scheduledKg: totals.scheduledKg,
      issuedKg: totals.issuedKg,
      consumedKg: totals.consumedKg,
      wastageKg: totals.wastageKg,
      updatedAt: new Date(),
    })
    .where(eq(steelReconciliations.id, reconciliationId));
  return totals;
}

export const steelReconciliationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(steelReconciliations)
        .where(eq(steelReconciliations.projectId, input.projectId))
        .orderBy(desc(steelReconciliations.createdAt)),
    ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const header = await loadReconOr404(ctx.db, input.id).catch(() => null);
      if (!header) return null;
      const lines = await loadLines(ctx.db, input.id);
      return { ...header, lines, totals: steelReconTotals(lines) };
    }),

  create: author.input(SteelReconCreate).mutation(async ({ ctx, input }) => {
    if (input.bbsId) {
      const [bbs] = await ctx.db
        .select({ id: bbsSchedules.id, projectId: bbsSchedules.projectId })
        .from(bbsSchedules)
        .where(eq(bbsSchedules.id, input.bbsId));
      if (!bbs || bbs.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "BBS not found on this project" });
      }
    }
    const { ref } = await nextRef(ctx.db, "steelrecon", "SREC");
    const [row] = await ctx.db
      .insert(steelReconciliations)
      .values({
        ref,
        projectId: input.projectId,
        bbsId: input.bbsId ?? null,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();

    if (input.bbsId) {
      const items = await ctx.db
        .select()
        .from(bbsItems)
        .where(eq(bbsItems.bbsId, input.bbsId));
      const summary = bbsDiameterSummary(items);
      if (summary.length) {
        await ctx.db.insert(steelReconciliationItems).values(
          summary.map((s, i) => ({
            reconciliationId: row!.id,
            diaMm: s.diaMm,
            scheduledKg: s.weightKg,
            issuedKg: 0,
            consumedKg: 0,
            wastageKg: 0,
            sortOrder: i,
          })),
        );
        await recomputeTotals(ctx.db, row!.id);
      }
    }

    await writeAudit(ctx.db, {
      entity: "steel_reconciliation",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  seedFromBbs: author.input(SteelReconSeedFromBbs).mutation(async ({ ctx, input }) => {
    const header = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(header.status);
    const [bbs] = await ctx.db
      .select({ id: bbsSchedules.id, projectId: bbsSchedules.projectId })
      .from(bbsSchedules)
      .where(eq(bbsSchedules.id, input.bbsId));
    if (!bbs || bbs.projectId !== header.projectId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "BBS not found on this project" });
    }

    const items = await ctx.db.select().from(bbsItems).where(eq(bbsItems.bbsId, input.bbsId));
    const summary = bbsDiameterSummary(items);
    const existing = await loadLines(ctx.db, input.reconciliationId);
    const byDia = new Map(existing.map((l) => [l.diaMm, l]));

    for (const [i, s] of summary.entries()) {
      const cur = byDia.get(s.diaMm);
      if (cur) {
        await ctx.db
          .update(steelReconciliationItems)
          .set({
            scheduledKg: s.weightKg,
            wastageKg: round2(cur.issuedKg - cur.consumedKg),
          })
          .where(eq(steelReconciliationItems.id, cur.id));
        byDia.delete(s.diaMm);
      } else {
        await ctx.db.insert(steelReconciliationItems).values({
          reconciliationId: input.reconciliationId,
          diaMm: s.diaMm,
          scheduledKg: s.weightKg,
          issuedKg: 0,
          consumedKg: 0,
          wastageKg: 0,
          sortOrder: i,
        });
      }
    }

    await ctx.db
      .update(steelReconciliations)
      .set({ bbsId: input.bbsId, updatedAt: new Date() })
      .where(eq(steelReconciliations.id, input.reconciliationId));
    const totals = await recomputeTotals(ctx.db, input.reconciliationId);
    return { ok: true as const, totals, diameters: summary.length };
  }),

  addLine: author.input(SteelReconLineInput).mutation(async ({ ctx, input }) => {
    const header = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(header.status);
    const wastageKg = round2(input.issuedKg - input.consumedKg);
    const [row] = await ctx.db
      .insert(steelReconciliationItems)
      .values({
        reconciliationId: input.reconciliationId,
        diaMm: input.diaMm,
        scheduledKg: input.scheduledKg,
        issuedKg: input.issuedKg,
        consumedKg: input.consumedKg,
        wastageKg,
      })
      .returning();
    await recomputeTotals(ctx.db, input.reconciliationId);
    return row!;
  }),

  updateLine: author.input(SteelReconLineUpdate).mutation(async ({ ctx, input }) => {
    const header = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(header.status);
    const [before] = await ctx.db
      .select()
      .from(steelReconciliationItems)
      .where(
        and(
          eq(steelReconciliationItems.id, input.id),
          eq(steelReconciliationItems.reconciliationId, input.reconciliationId),
        ),
      );
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const issuedKg = input.issuedKg ?? before.issuedKg;
    const consumedKg = input.consumedKg ?? before.consumedKg;
    const [row] = await ctx.db
      .update(steelReconciliationItems)
      .set({
        ...(input.scheduledKg !== undefined ? { scheduledKg: input.scheduledKg } : {}),
        ...(input.issuedKg !== undefined ? { issuedKg: input.issuedKg } : {}),
        ...(input.consumedKg !== undefined ? { consumedKg: input.consumedKg } : {}),
        wastageKg: round2(issuedKg - consumedKg),
      })
      .where(eq(steelReconciliationItems.id, input.id))
      .returning();
    await recomputeTotals(ctx.db, input.reconciliationId);
    return row!;
  }),

  removeLine: author.input(SteelReconLineRemove).mutation(async ({ ctx, input }) => {
    const header = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(header.status);
    await ctx.db
      .delete(steelReconciliationItems)
      .where(
        and(
          eq(steelReconciliationItems.id, input.id),
          eq(steelReconciliationItems.reconciliationId, input.reconciliationId),
        ),
      );
    await recomputeTotals(ctx.db, input.reconciliationId);
    return { ok: true as const };
  }),

  finalize: approver.input(SteelReconFinalize).mutation(async ({ ctx, input }) => {
    const header = await loadReconOr404(ctx.db, input.id);
    assertDraft(header.status);
    const totals = await recomputeTotals(ctx.db, input.id);
    const [row] = await ctx.db
      .update(steelReconciliations)
      .set({
        status: "FINALIZED",
        finalizedById: ctx.user.id,
        finalizedAt: new Date(),
        updatedAt: new Date(),
        ...totals,
      })
      .where(eq(steelReconciliations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "steel_reconciliation",
      entityId: input.id,
      action: "FINALIZE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  remove: author
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const header = await loadReconOr404(ctx.db, input.id);
      assertDraft(header.status);
      await ctx.db.delete(steelReconciliations).where(eq(steelReconciliations.id, input.id));
      return { ok: true as const };
    }),
});
