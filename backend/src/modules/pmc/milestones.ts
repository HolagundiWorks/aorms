import { PmcMilestoneCreate, PmcMilestoneUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { pmcMilestones, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const pmcMilestonesRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(pmcMilestones)
        .where(eq(pmcMilestones.projectId, input.projectId))
        .orderBy(asc(pmcMilestones.sortOrder), asc(pmcMilestones.plannedDate), asc(pmcMilestones.createdAt));
    }),

  /** Delayed / at-risk milestones across active projects (AProc home). */
  portfolioAttention: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: pmcMilestones.id,
        projectId: pmcMilestones.projectId,
        projectTitle: projectOffices.title,
        projectRef: projectOffices.ref,
        ref: pmcMilestones.ref,
        title: pmcMilestones.title,
        plannedDate: pmcMilestones.plannedDate,
        percentComplete: pmcMilestones.percentComplete,
        status: pmcMilestones.status,
      })
      .from(pmcMilestones)
      .innerJoin(projectOffices, eq(pmcMilestones.projectId, projectOffices.id))
      .where(
        and(
          isNull(projectOffices.archivedAt),
          inArray(pmcMilestones.status, ["AT_RISK", "DELAYED"]),
        ),
      )
      .orderBy(asc(pmcMilestones.plannedDate))
      .limit(40);
  }),

  create: manage.input(PmcMilestoneCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "pmc_milestone", "MS");
    const [row] = await ctx.db
      .insert(pmcMilestones)
      .values({
        projectId: input.projectId,
        ref,
        title: input.title,
        plannedDate: input.plannedDate ?? null,
        baselineRef: input.baselineRef ?? null,
        sortOrder: input.sortOrder ?? 0,
        notes: input.notes ?? null,
        status: "PLANNED",
        percentComplete: 0,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "pmc_milestone",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, projectId: input.projectId },
    });
    return row!;
  }),

  update: manage.input(PmcMilestoneUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(pmcMilestones)
      .where(eq(pmcMilestones.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const status = input.status ?? before.status;
    const percentComplete =
      input.percentComplete !== undefined
        ? input.percentComplete
        : status === "COMPLETE"
          ? 100
          : before.percentComplete;
    const [row] = await ctx.db
      .update(pmcMilestones)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.plannedDate !== undefined ? { plannedDate: input.plannedDate } : {}),
        ...(input.actualDate !== undefined ? { actualDate: input.actualDate } : {}),
        percentComplete,
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.baselineRef !== undefined ? { baselineRef: input.baselineRef } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(pmcMilestones.id, input.id), eq(pmcMilestones.projectId, input.projectId)))
      .returning();
    await writeAudit(ctx.db, {
      entity: "pmc_milestone",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status, percentComplete: before.percentComplete },
      after: { status: row!.status, percentComplete: row!.percentComplete },
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(pmcMilestones)
        .where(eq(pmcMilestones.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(pmcMilestones).where(eq(pmcMilestones.id, input.id));
      await writeAudit(ctx.db, {
        entity: "pmc_milestone",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: before.ref },
      });
      return { ok: true as const };
    }),

  /** Summary counts for a project (Delivery header / home tiles). */
  summaryByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          total: sql<number>`count(*)::int`,
          complete: sql<number>`count(*) filter (where status = 'COMPLETE')::int`,
          attention: sql<number>`count(*) filter (where status in ('AT_RISK','DELAYED'))::int`,
        })
        .from(pmcMilestones)
        .where(eq(pmcMilestones.projectId, input.projectId));
      return row ?? { total: 0, complete: 0, attention: 0 };
    }),
});
