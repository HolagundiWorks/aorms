import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { phases, progressReports, projectOffices } from "../../db/schema.js";
import { assertProjectAccess } from "../../lib/projectAccess.js";
import { siteProcedure } from "../inspection/siteProcedure.js";
import { router } from "../../trpc/trpc.js";

/**
 * Site supervisor firm-portal depth (S10) — project summary + issued progress.
 * Scoped via assertProjectAccess (assigned / created projects).
 */
export const sitePortalRouter = router({
  projectDetail: siteProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      const [project] = await ctx.db
        .select({
          ref: projectOffices.ref,
          title: projectOffices.title,
          status: projectOffices.status,
          projectType: projectOffices.projectType,
          jurisdiction: projectOffices.jurisdiction,
          currentPhaseId: projectOffices.currentPhaseId,
        })
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId));
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const phaseRows = await ctx.db
        .select({
          id: phases.id,
          code: phases.code,
          label: phases.label,
          billingPct: phases.billingPct,
          sortOrder: phases.sortOrder,
        })
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));
      const currentSortOrder =
        phaseRows.find((p) => p.id === project.currentPhaseId)?.sortOrder ?? -1;

      return {
        project: {
          ref: project.ref,
          title: project.title,
          status: project.status,
          projectType: project.projectType,
          jurisdiction: project.jurisdiction,
        },
        phases: phaseRows.map((ph) => ({
          code: ph.code,
          label: ph.label,
          billingPct: ph.billingPct,
          status:
            ph.sortOrder < currentSortOrder
              ? "Complete"
              : ph.id === project.currentPhaseId
                ? "Active"
                : "Pending",
        })),
      };
    }),

  issuedProgressReports: siteProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      return ctx.db
        .select({
          id: progressReports.id,
          periodStart: progressReports.periodStart,
          periodEnd: progressReports.periodEnd,
          physicalProgressPct: progressReports.physicalProgressPct,
          openSnagCount: progressReports.openSnagCount,
          status: progressReports.status,
        })
        .from(progressReports)
        .where(
          and(
            eq(progressReports.projectId, input.projectId),
            eq(progressReports.status, "ISSUED"),
          ),
        )
        .orderBy(desc(progressReports.periodEnd));
    }),
});
