import { PmcPackageCreate, PmcPackageUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { pmcPackages, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const pmcPackagesRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(pmcPackages)
        .where(eq(pmcPackages.projectId, input.projectId))
        .orderBy(asc(pmcPackages.createdAt));
    }),

  /** Open packages (not complete/cancelled) per project for AProc home. */
  portfolioOpen: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        projectId: pmcPackages.projectId,
        projectTitle: projectOffices.title,
        projectRef: projectOffices.ref,
        openCount: sql<number>`count(*)::int`,
      })
      .from(pmcPackages)
      .innerJoin(projectOffices, eq(pmcPackages.projectId, projectOffices.id))
      .where(
        and(
          isNull(projectOffices.archivedAt),
          ne(pmcPackages.status, "COMPLETE"),
          ne(pmcPackages.status, "CANCELLED"),
        ),
      )
      .groupBy(pmcPackages.projectId, projectOffices.title, projectOffices.ref)
      .orderBy(sql`count(*) desc`);
  }),

  create: manage.input(PmcPackageCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "pmc_package", "PKG");
    const [row] = await ctx.db
      .insert(pmcPackages)
      .values({
        projectId: input.projectId,
        ref,
        title: input.title,
        trade: input.trade ?? null,
        contractorId: input.contractorId ?? null,
        contractValuePaise: input.contractValuePaise ?? null,
        tenderCloseDate: input.tenderCloseDate ?? null,
        status: "DRAFT",
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "pmc_package",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, projectId: input.projectId },
    });
    return row!;
  }),

  update: manage.input(PmcPackageUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(pmcPackages).where(eq(pmcPackages.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const [row] = await ctx.db
      .update(pmcPackages)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.trade !== undefined ? { trade: input.trade } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.contractorId !== undefined ? { contractorId: input.contractorId } : {}),
        ...(input.contractValuePaise !== undefined
          ? { contractValuePaise: input.contractValuePaise }
          : {}),
        ...(input.tenderCloseDate !== undefined ? { tenderCloseDate: input.tenderCloseDate } : {}),
        ...(input.awardDate !== undefined ? { awardDate: input.awardDate } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(pmcPackages.id, input.id), eq(pmcPackages.projectId, input.projectId)))
      .returning();
    await writeAudit(ctx.db, {
      entity: "pmc_package",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: row!.status },
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(pmcPackages).where(eq(pmcPackages.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(pmcPackages).where(eq(pmcPackages.id, input.id));
      await writeAudit(ctx.db, {
        entity: "pmc_package",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: before.ref },
      });
      return { ok: true as const };
    }),
});
