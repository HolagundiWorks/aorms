import {
  JointMeasurementAnnotationUpsert,
  JointMeasurementUpsertDraft,
  JointMeasurementUpsertLines,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assignments,
  jointMeasurementAnnotations,
  jointMeasurements,
  teamMembers,
  users,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertProjectAccess } from "../../lib/projectAccess.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";
import { siteProcedure } from "../inspection/siteProcedure.js";
import {
  assertEditable,
  importJmIntoMeasurementBook,
  loadJmBundle,
  publishApprovedJm,
  replaceLines,
  requireJm,
  resolveSourceSubmission,
} from "./service.js";

const approve = capabilityProcedure("cost:approve");

async function projectTeam(db: Parameters<typeof writeAudit>[0], projectId: string) {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(assignments)
    .innerJoin(teamMembers, eq(teamMembers.id, assignments.teamMemberId))
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(and(eq(assignments.projectId, projectId), sql`${users.id} IS NOT NULL`))
    .orderBy(asc(users.fullName));
}

/**
 * Joint measurement — site recorder + staff approval + rate-book seed.
 * Site mutations use `siteProcedure`; approve/reject use `cost:approve`.
 */
export const jointMeasurementRouter = router({
  projectTeam: siteProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      return projectTeam(ctx.db, input.projectId);
    }),

  listForSite: siteProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      return ctx.db
        .select({
          id: jointMeasurements.id,
          subject: jointMeasurements.subject,
          measuredOn: jointMeasurements.measuredOn,
          status: jointMeasurements.status,
          attentionToId: jointMeasurements.attentionToId,
          createdAt: jointMeasurements.createdAt,
          submittedAt: jointMeasurements.submittedAt,
          reviewedAt: jointMeasurements.reviewedAt,
        })
        .from(jointMeasurements)
        .where(eq(jointMeasurements.projectId, input.projectId))
        .orderBy(desc(jointMeasurements.createdAt));
    }),

  get: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bundle = await loadJmBundle(ctx.db, input.id);
      await assertProjectAccess(ctx.db, ctx.user, bundle.header.projectId);
      return bundle;
    }),

  /** Staff detail (same payload; project access via office roles). */
  getForStaff: capabilityProcedure("workspace:view")
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bundle = await loadJmBundle(ctx.db, input.id);
      await assertProjectAccess(ctx.db, ctx.user, bundle.header.projectId);
      return bundle;
    }),

  listPending: approve.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: jointMeasurements.id,
        projectId: jointMeasurements.projectId,
        subject: jointMeasurements.subject,
        measuredOn: jointMeasurements.measuredOn,
        status: jointMeasurements.status,
        submittedAt: jointMeasurements.submittedAt,
        attentionToId: jointMeasurements.attentionToId,
        attentionToName: users.fullName,
      })
      .from(jointMeasurements)
      .leftJoin(users, eq(users.id, jointMeasurements.attentionToId))
      .where(eq(jointMeasurements.status, "SUBMITTED"))
      .orderBy(asc(jointMeasurements.submittedAt));
  }),

  /** Approved JMs available to seed rate books (`fees:manage`). */
  listApproved: capabilityProcedure("fees:manage").query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: jointMeasurements.id,
        projectId: jointMeasurements.projectId,
        subject: jointMeasurements.subject,
        measuredOn: jointMeasurements.measuredOn,
        reviewedAt: jointMeasurements.reviewedAt,
      })
      .from(jointMeasurements)
      .where(eq(jointMeasurements.status, "APPROVED"))
      .orderBy(desc(jointMeasurements.reviewedAt));
  }),

  upsertDraft: siteProcedure.input(JointMeasurementUpsertDraft).mutation(async ({ ctx, input }) => {
    await assertProjectAccess(ctx.db, ctx.user, input.projectId);

    if (input.id) {
      const existing = await requireJm(ctx.db, input.id);
      if (existing.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
      assertEditable(existing.status);
      const [row] = await ctx.db
        .update(jointMeasurements)
        .set({
          subject: input.subject.trim(),
          measuredOn: input.measuredOn ?? null,
          details: input.details?.trim() || null,
          attentionToId: input.attentionToId ?? null,
          contractorId: input.contractorId ?? existing.contractorId,
          sourceSubmissionId: input.sourceSubmissionId ?? existing.sourceSubmissionId,
          status: existing.status === "REJECTED" ? "DRAFT" : existing.status,
          updatedAt: new Date(),
        })
        .where(eq(jointMeasurements.id, input.id))
        .returning();
      return row!;
    }

    const [row] = await ctx.db
      .insert(jointMeasurements)
      .values({
        projectId: input.projectId,
        subject: input.subject.trim(),
        measuredOn: input.measuredOn ?? null,
        details: input.details?.trim() || null,
        attentionToId: input.attentionToId ?? null,
        contractorId: input.contractorId ?? null,
        sourceSubmissionId: input.sourceSubmissionId ?? null,
        status: "DRAFT",
        submittedById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "joint_measurement",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  upsertLines: siteProcedure.input(JointMeasurementUpsertLines).mutation(async ({ ctx, input }) => {
    const header = await requireJm(ctx.db, input.jointMeasurementId);
    await assertProjectAccess(ctx.db, ctx.user, header.projectId);
    assertEditable(header.status);
    const lines = await replaceLines(ctx.db, input.jointMeasurementId, input.lines);
    await ctx.db
      .update(jointMeasurements)
      .set({ updatedAt: new Date(), status: header.status === "REJECTED" ? "DRAFT" : header.status })
      .where(eq(jointMeasurements.id, input.jointMeasurementId));
    return lines;
  }),

  submitForApproval: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const header = await requireJm(ctx.db, input.id);
      await assertProjectAccess(ctx.db, ctx.user, header.projectId);
      assertEditable(header.status);
      const { lines } = await loadJmBundle(ctx.db, input.id);
      if (lines.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one measurement line before submitting",
        });
      }
      const [row] = await ctx.db
        .update(jointMeasurements)
        .set({
          status: "SUBMITTED",
          submittedById: ctx.user.id,
          submittedAt: new Date(),
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          updatedAt: new Date(),
        })
        .where(eq(jointMeasurements.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "joint_measurement",
        entityId: input.id,
        action: "SUBMIT",
        actorId: ctx.user.id,
      });
      return row!;
    }),

  approve: approve
    .input(z.object({ id: z.string().uuid(), reviewNote: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const header = await requireJm(ctx.db, input.id);
      await assertProjectAccess(ctx.db, ctx.user, header.projectId);
      if (header.status !== "SUBMITTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only submitted joint measurements can be approved",
        });
      }
      const [row] = await ctx.db
        .update(jointMeasurements)
        .set({
          status: "APPROVED",
          reviewedById: ctx.user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(jointMeasurements.id, input.id))
        .returning();

      const imported = await importJmIntoMeasurementBook(ctx.db, input.id);
      await resolveSourceSubmission(
        ctx.db,
        header.sourceSubmissionId,
        input.reviewNote?.trim() || "Joint measurement approved",
      );
      await publishApprovedJm(ctx.db, input.id);
      await writeAudit(ctx.db, {
        entity: "joint_measurement",
        entityId: input.id,
        action: "APPROVE",
        actorId: ctx.user.id,
        after: { bookId: imported.book.id, rowCount: imported.rows.length },
      });
      return { header: row!, bookId: imported.book.id, importedRows: imported.rows.length };
    }),

  reject: approve
    .input(
      z.object({
        id: z.string().uuid(),
        reviewNote: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const header = await requireJm(ctx.db, input.id);
      await assertProjectAccess(ctx.db, ctx.user, header.projectId);
      if (header.status !== "SUBMITTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only submitted joint measurements can be rejected",
        });
      }
      const [row] = await ctx.db
        .update(jointMeasurements)
        .set({
          status: "REJECTED",
          reviewedById: ctx.user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote.trim(),
          updatedAt: new Date(),
        })
        .where(eq(jointMeasurements.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "joint_measurement",
        entityId: input.id,
        action: "REJECT",
        actorId: ctx.user.id,
        after: { reviewNote: input.reviewNote },
      });
      return row!;
    }),

  upsertAnnotation: siteProcedure
    .input(JointMeasurementAnnotationUpsert)
    .mutation(async ({ ctx, input }) => {
      const header = await requireJm(ctx.db, input.jointMeasurementId);
      await assertProjectAccess(ctx.db, ctx.user, header.projectId);
      assertEditable(header.status);

      if (input.id) {
        const [row] = await ctx.db
          .update(jointMeasurementAnnotations)
          .set({
            drawingId: input.drawingId,
            tool: input.tool,
            pageNo: input.pageNo ?? 0,
            color: input.color ?? "#FF4F18",
            label: input.label ?? null,
            geometry: input.geometry,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jointMeasurementAnnotations.id, input.id),
              eq(jointMeasurementAnnotations.jointMeasurementId, input.jointMeasurementId),
            ),
          )
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }

      const [row] = await ctx.db
        .insert(jointMeasurementAnnotations)
        .values({
          jointMeasurementId: input.jointMeasurementId,
          drawingId: input.drawingId,
          tool: input.tool,
          pageNo: input.pageNo ?? 0,
          color: input.color ?? "#FF4F18",
          label: input.label ?? null,
          geometry: input.geometry,
          createdById: ctx.user.id,
        })
        .returning();
      return row!;
    }),

  removeAnnotation: siteProcedure
    .input(z.object({ id: z.string().uuid(), jointMeasurementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const header = await requireJm(ctx.db, input.jointMeasurementId);
      await assertProjectAccess(ctx.db, ctx.user, header.projectId);
      assertEditable(header.status);
      await ctx.db
        .delete(jointMeasurementAnnotations)
        .where(
          and(
            eq(jointMeasurementAnnotations.id, input.id),
            eq(jointMeasurementAnnotations.jointMeasurementId, input.jointMeasurementId),
          ),
        );
      return { ok: true };
    }),

});
