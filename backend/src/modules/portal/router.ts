import {
  ClientImpactResponseInput,
  canAcknowledgeTransmittal,
  PortalAcknowledgeInput,
  PortalApprovalRespondInput,
  PortalChangeRequestInput,
  PortalFeedbackInput,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  activities,
  approvals,
  assignments,
  drawings,
  moms,
  phases,
  pmcRaBills,
  pmcSteelCerts,
  portalSubmissions,
  projectOffices,
  teamMembers,
  transmittals,
  users,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { getFirm } from "../../lib/firm.js";
import {
  portalAwardedTenders,
  portalConfirmedSiteVisits,
  portalIssuedInspections,
  portalIssuedInvoices,
  portalIssuedProgressReports,
  portalIssuedTransmittals,
  portalPublishedRunningBills,
  portalReadyDrawings,
  portalSentApprovals,
  portalSiteReference,
} from "../../lib/sync/hubPortal.js";
import { presignedGet } from "../../lib/storage.js";
import { addMessage, listMessages } from "../../lib/submissionThread.js";
import { clientProcedure, router } from "../../trpc/trpc.js";

/** Today as an ISO date string (YYYY-MM-DD). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read-only client portal. Every procedure is scoped to the logged-in client
 * user's clientId — a portal user can only ever see their own projects.
 */
export const portalRouter = router({
  /** Firm name + logo for portal header branding. */
  branding: clientProcedure.query(async ({ ctx }) => {
    const f = await getFirm(ctx.db);
    const logoUrl = f.logoKey ? await presignedGet(f.logoKey).catch(() => null) : null;
    return { companyName: f.companyName, logoUrl };
  }),

  myProjects: clientProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: projectOffices.id,
        ref: projectOffices.ref,
        title: projectOffices.title,
        status: projectOffices.status,
        projectType: projectOffices.projectType,
      })
      .from(projectOffices)
      .where(eq(projectOffices.clientId, ctx.user.clientId))
      .orderBy(desc(projectOffices.createdAt));
  }),

  projectDetail: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projectOffices)
        .where(
          and(
            eq(projectOffices.id, input.projectId),
            eq(projectOffices.clientId, ctx.user.clientId),
          ),
        );
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
      const currentSortOrder = phaseRows.find((p) => p.id === project.currentPhaseId)?.sortOrder ?? -1;

      // Only issued/paid invoices are visible to the client.
      const invoiceRows = await portalIssuedInvoices(ctx.db, input.projectId);

      // Approvals that have actually been sent (no drafts).
      const approvalRows = await portalSentApprovals(ctx.db, input.projectId);

      // Only drawings the worker has finished processing.
      const drawingRows = await portalReadyDrawings(ctx.db, input.projectId);
      const transmittalRows = await portalIssuedTransmittals(ctx.db, input.projectId);
      const [
        runningBillRows,
        inspectionRows,
        siteVisitRows,
        tenderRows,
        siteReference,
      ] = await Promise.all([
        portalPublishedRunningBills(ctx.db, input.projectId),
        portalIssuedInspections(ctx.db, input.projectId),
        portalConfirmedSiteVisits(ctx.db, input.projectId),
        portalAwardedTenders(ctx.db, input.projectId),
        portalSiteReference(ctx.db, input.projectId),
      ]);
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
          status: ph.sortOrder < currentSortOrder ? "Complete"
            : ph.id === project.currentPhaseId ? "Active"
            : "Pending",
        })),
        invoices: invoiceRows,
        approvals: approvalRows,
        drawings: drawingRows,
        transmittals: transmittalRows,
        runningBills: runningBillRows,
        inspections: inspectionRows,
        siteVisits: siteVisitRows,
        tenders: tenderRows,
        siteReference,
      };
    }),

  /** This client's own submissions for a project (read-back of their writes). */
  mySubmissions: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({
          id: portalSubmissions.id,
          kind: portalSubmissions.kind,
          subject: portalSubmissions.subject,
          body: portalSubmissions.body,
          rating: portalSubmissions.rating,
          status: portalSubmissions.status,
          responseNote: portalSubmissions.responseNote,
          revisionCategory: portalSubmissions.revisionCategory,
          affectsCosting: portalSubmissions.affectsCosting,
          affectsTimeline: portalSubmissions.affectsTimeline,
          isBillable: portalSubmissions.isBillable,
          architectComment: portalSubmissions.architectComment,
          attentionToName: users.fullName,
          refDrawingRef: drawings.ref,
          refDrawingTitle: drawings.title,
          createdAt: portalSubmissions.createdAt,
        })
        .from(portalSubmissions)
        .leftJoin(users, eq(users.id, portalSubmissions.attentionToId))
        .leftJoin(drawings, eq(drawings.id, portalSubmissions.refDrawingId))
        .where(eq(portalSubmissions.projectId, input.projectId))
        .orderBy(desc(portalSubmissions.createdAt));
    }),

  /**
   * Issued meeting minutes for a project — the client-visible record of what
   * was discussed. Draft MoMs stay office-internal.
   */
  listMoms: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({
          id: moms.id,
          ref: moms.ref,
          title: moms.title,
          meetingDate: moms.meetingDate,
          venue: moms.venue,
          attendees: moms.attendees,
          minutes: moms.minutes,
          createdAt: moms.createdAt,
        })
        .from(moms)
        .where(and(eq(moms.projectId, input.projectId), eq(moms.status, "ISSUED")))
        .orderBy(desc(moms.meetingDate), desc(moms.createdAt));
    }),

  /**
   * @deprecated ESTI is desktop-only — firm portals no longer draft MoM revisions.
   * Kept as a stub so older clients fail cleanly.
   */
  suggestMomRevisions: clientProcedure
    .input(z.object({ momId: z.string().uuid() }))
    .mutation(async () => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "ESTI is not available on the client portal — raise a change request manually.",
      });
    }),

  /** Project team members the client can address a change request to. */
  projectTeam: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({ id: users.id, fullName: users.fullName, role: users.role })
        .from(assignments)
        .innerJoin(teamMembers, eq(teamMembers.id, assignments.teamMemberId))
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .where(and(eq(assignments.projectId, input.projectId), sql`${users.id} IS NOT NULL`))
        .orderBy(asc(users.fullName));
    }),

  /** Issued progress reports for the client's projects (hub published store when ESTI_ROLE=hub). */
  issuedProgressReports: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }).optional())
    .query(async ({ ctx, input }) => {
      const owned = await ctx.db
        .select({
          id: projectOffices.id,
          ref: projectOffices.ref,
          title: projectOffices.title,
        })
        .from(projectOffices)
        .where(eq(projectOffices.clientId, ctx.user.clientId));
      if (owned.length === 0) return [];
      if (input?.projectId && !owned.some((p) => p.id === input.projectId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const targets = input?.projectId
        ? owned.filter((p) => p.id === input.projectId)
        : owned;
      const out: Array<{
        id: string;
        projectId: string;
        projectRef: string;
        projectTitle: string;
        periodStart: string;
        periodEnd: string;
        physicalProgressPct: number | null;
        openSnagCount: number | null;
        status: string;
        pdfKey: string | null;
        pdfStatus: string;
      }> = [];
      for (const proj of targets) {
        const rows = await portalIssuedProgressReports(ctx.db, proj.id);
        for (const r of rows) {
          out.push({
            id: r.id,
            projectId: proj.id,
            projectRef: proj.ref,
            projectTitle: proj.title,
            periodStart: r.periodStart,
            periodEnd: r.periodEnd,
            physicalProgressPct: r.physicalProgressPct,
            openSnagCount: r.openSnagCount,
            status: r.status,
            pdfKey: null,
            pdfStatus: "NONE",
          });
        }
      }
      return out;
    }),

  /** AProc — certified / sent RA bills for the client's projects. */
  certifiedRaBills: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }).optional())
    .query(async ({ ctx, input }) => {
      const owned = await ctx.db
        .select({ id: projectOffices.id })
        .from(projectOffices)
        .where(eq(projectOffices.clientId, ctx.user.clientId));
      const ids = owned.map((p) => p.id);
      if (ids.length === 0) return [];
      if (input?.projectId) {
        if (!ids.includes(input.projectId)) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db
        .select({
          id: pmcRaBills.id,
          projectId: pmcRaBills.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          ref: pmcRaBills.ref,
          billNo: pmcRaBills.billNo,
          periodStart: pmcRaBills.periodStart,
          periodEnd: pmcRaBills.periodEnd,
          status: pmcRaBills.status,
          grossPaise: pmcRaBills.grossPaise,
          advanceRecoveryPaise: pmcRaBills.advanceRecoveryPaise,
          retentionPaise: pmcRaBills.retentionPaise,
          otherDeductionPaise: pmcRaBills.otherDeductionPaise,
          certifiedAt: pmcRaBills.certifiedAt,
          sentAt: pmcRaBills.sentAt,
          pdfKey: pmcRaBills.pdfKey,
          pdfStatus: pmcRaBills.pdfStatus,
        })
        .from(pmcRaBills)
        .innerJoin(projectOffices, eq(pmcRaBills.projectId, projectOffices.id))
        .where(
          and(
            inArray(pmcRaBills.status, ["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"]),
            input?.projectId
              ? eq(pmcRaBills.projectId, input.projectId)
              : inArray(pmcRaBills.projectId, ids),
          ),
        )
        .orderBy(desc(pmcRaBills.periodEnd));
    }),

  /** AProc — certified / sent steel certifications for the client's projects. */
  certifiedSteelCerts: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }).optional())
    .query(async ({ ctx, input }) => {
      const owned = await ctx.db
        .select({ id: projectOffices.id })
        .from(projectOffices)
        .where(eq(projectOffices.clientId, ctx.user.clientId));
      const ids = owned.map((p) => p.id);
      if (ids.length === 0) return [];
      if (input?.projectId) {
        if (!ids.includes(input.projectId)) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db
        .select({
          id: pmcSteelCerts.id,
          projectId: pmcSteelCerts.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          ref: pmcSteelCerts.ref,
          periodStart: pmcSteelCerts.periodStart,
          periodEnd: pmcSteelCerts.periodEnd,
          status: pmcSteelCerts.status,
          issuedKg: pmcSteelCerts.issuedKg,
          consumedKg: pmcSteelCerts.consumedKg,
          wastagePct: pmcSteelCerts.wastagePct,
          certifiedAt: pmcSteelCerts.certifiedAt,
          sentAt: pmcSteelCerts.sentAt,
        })
        .from(pmcSteelCerts)
        .innerJoin(projectOffices, eq(pmcSteelCerts.projectId, projectOffices.id))
        .where(
          and(
            inArray(pmcSteelCerts.status, ["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"]),
            input?.projectId
              ? eq(pmcSteelCerts.projectId, input.projectId)
              : inArray(pmcSteelCerts.projectId, ids),
          ),
        )
        .orderBy(desc(pmcSteelCerts.periodEnd));
    }),

  /** Revision stats for the client dashboard — change request breakdown by category. */
  revisionStats: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      const rows = await ctx.db
        .select({
          category: portalSubmissions.revisionCategory,
          count: sql<number>`count(*)::int`,
        })
        .from(portalSubmissions)
        .where(and(
          eq(portalSubmissions.projectId, input.projectId),
          eq(portalSubmissions.kind, "CHANGE_REQUEST"),
        ))
        .groupBy(portalSubmissions.revisionCategory);

      const drawingRows = await ctx.db
        .select({
          revisionNote: drawings.revisionNote,
          count: sql<number>`count(*)::int`,
        })
        .from(drawings)
        .where(and(
          eq(drawings.projectId, input.projectId),
          sql`${drawings.rootId} IS NOT NULL`,
        ))
        .groupBy(drawings.revisionNote);

      return { submissions: rows, drawings: drawingRows };
    }),

  /** Client responds to an impact assessment (approve or reject). */
  respondToImpact: clientProcedure
    .input(ClientImpactResponseInput)
    .mutation(async ({ ctx, input }) => {
      const sub = await assertOwnedSubmission(ctx, input.submissionId);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
      const newStatus = input.approved ? "CLIENT_APPROVED" : "CLIENT_REJECTED";
      await ctx.db
        .update(portalSubmissions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(portalSubmissions.id, input.submissionId));
      if (input.remarks) {
        await addMessage(ctx.db, { portalSubmissionId: input.submissionId },
          { id: ctx.user.id, name: ctx.user.fullName, side: "CLIENT" }, input.remarks);
      }
      await writeActivity(ctx.db, {
        projectId: sub.projectId,
        objectType: "portal_submission",
        objectId: input.submissionId,
        eventType: "portal.impact_response",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Client ${input.approved ? "approved" : "rejected"} impact assessment on: ${sub.subject}`,
      });
      return { ok: true as const };
    }),

  /** Read the firm↔client conversation thread on one of the client's submissions. */
  submissionThread: clientProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedSubmission(ctx, input.submissionId);
      return listMessages(ctx.db, { portalSubmissionId: input.submissionId });
    }),

  /** Post a reply on one of the client's own submissions. */
  replySubmission: clientProcedure
    .input(z.object({ submissionId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await assertOwnedSubmission(ctx, input.submissionId);
      await addMessage(ctx.db, { portalSubmissionId: input.submissionId },
        { id: ctx.user.id, name: ctx.user.fullName, side: "CLIENT" }, input.body);
      await writeActivity(ctx.db, {
        projectId: sub.projectId,
        objectType: "portal_submission",
        objectId: input.submissionId,
        eventType: "portal.reply",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Client replied on: ${sub.subject}`,
      });
      return { ok: true as const };
    }),

  /** Project activity timeline — only records explicitly shared with the client. */
  activityFeed: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({
          id: activities.id,
          eventType: activities.eventType,
          summary: activities.summary,
          actorName: activities.actorName,
          createdAt: activities.createdAt,
        })
        .from(activities)
        .where(and(eq(activities.projectId, input.projectId), eq(activities.visibility, "ALL")))
        .orderBy(desc(activities.createdAt))
        .limit(50);
    }),

  /** Record an approve / request-revisions / reject decision on a sent approval. */
  respondApproval: clientProcedure
    .input(PortalApprovalRespondInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: approvals.id,
          projectId: approvals.projectId,
          title: approvals.title,
          status: approvals.status,
          clientId: projectOffices.clientId,
        })
        .from(approvals)
        .innerJoin(projectOffices, eq(projectOffices.id, approvals.projectId))
        .where(eq(approvals.id, input.approvalId));
      if (!row || row.clientId !== ctx.user.clientId) throw new TRPCError({ code: "NOT_FOUND" });
      // Only items the firm has actually sent can be responded to.
      if (!["SENT", "REVISIONS"].includes(row.status))
        throw new TRPCError({ code: "BAD_REQUEST", message: "This item is not awaiting your response." });
      if (input.decision === "REVISIONS" && !input.revisionCategory)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select a revision category — Minor, Major or Critical.",
        });

      await ctx.db
        .update(approvals)
        .set({ status: input.decision, responseDate: today(), remarks: input.remarks ?? null, updatedAt: new Date() })
        .where(eq(approvals.id, input.approvalId));

      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "approval",
        objectId: input.approvalId,
        eventType: "approval.client_response",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Client recorded "${input.decision}" on approval: ${row.title}`,
        metadata: {
          decision: input.decision,
          remarks: input.remarks ?? null,
          revisionCategory: input.revisionCategory ?? null,
        },
      });
      return { ok: true as const };
    }),

  /** Acknowledge a specific shared object (drawing, approval, phase, transmittal, etc.). */
  acknowledge: clientProcedure
    .input(PortalAcknowledgeInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);

      // Transmittal acknowledgments also stamp the register row (SOP §3).
      if (input.objectType === "transmittal" && input.objectId) {
        const [row] = await ctx.db
          .select()
          .from(transmittals)
          .where(
            and(eq(transmittals.id, input.objectId), eq(transmittals.projectId, input.projectId)),
          );
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Transmittal not found." });
        const gate = canAcknowledgeTransmittal(row);
        if (!gate.ok)
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });
        await ctx.db
          .update(transmittals)
          .set({
            acknowledgedAt: new Date(),
            acknowledgedBy: ctx.user.fullName,
            acknowledgmentNote: input.subject,
            updatedAt: new Date(),
          })
          .where(eq(transmittals.id, row.id));
      }

      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "ACKNOWLEDGEMENT",
        objectType: input.objectType,
        objectId: input.objectId ?? null,
        subject: input.subject,
        eventSummary: `Client acknowledged: ${input.subject}`,
      });
    }),

  /** Submit a change request against the project (optionally a specific object). */
  submitChangeRequest: clientProcedure
    .input(PortalChangeRequestInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "CHANGE_REQUEST",
        objectType: input.objectType ?? null,
        objectId: input.objectId ?? null,
        subject: input.subject,
        body: input.body,
        revisionCategory: input.revisionCategory,
        attentionToId: input.attentionToId ?? null,
        refDrawingId: input.refDrawingId ?? null,
        eventSummary: `Client raised a ${input.revisionCategory} change request: ${input.subject}`,
      });
    }),

  /** Submit general feedback (optional 1–5 rating). */
  submitFeedback: clientProcedure
    .input(PortalFeedbackInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "FEEDBACK",
        subject: input.subject,
        body: input.body ?? null,
        rating: input.rating ?? null,
        eventSummary: `Client left feedback: ${input.subject}`,
      });

    }),

  /**
   * Request a meeting with the project team. Creates a MEETING_REQUEST
   * submission that appears in the office "Client requests" Work-hub tab.
   */
  requestMeeting: clientProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        preferredDate: z.string().optional(),
        mode: z.enum(["IN_PERSON", "VIDEO_CALL", "PHONE"]).optional(),
        agenda: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      const modeLabel = input.mode === "VIDEO_CALL" ? "Video call"
        : input.mode === "PHONE" ? "Phone call"
        : "In-person";
      const subject = input.preferredDate
        ? `Meeting request — ${modeLabel} on ${input.preferredDate}`
        : `Meeting request — ${modeLabel}`;
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "MEETING_REQUEST",
        subject,
        body: input.agenda ?? null,
        eventSummary: subject,
      });
    }),
});

/** Throw NOT_FOUND unless the project belongs to the logged-in client. */
async function assertOwnedProject(
  ctx: { db: DB; user: { clientId: string } },
  projectId: string,
): Promise<void> {
  const [project] = await ctx.db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(and(eq(projectOffices.id, projectId), eq(projectOffices.clientId, ctx.user.clientId)));
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
}

/** Load a submission and confirm it belongs to the logged-in client, or throw. */
async function assertOwnedSubmission(
  ctx: { db: DB; user: { clientId: string } },
  submissionId: string,
): Promise<{ projectId: string; subject: string }> {
  const [row] = await ctx.db
    .select({ projectId: portalSubmissions.projectId, subject: portalSubmissions.subject, clientId: portalSubmissions.clientId })
    .from(portalSubmissions)
    .where(eq(portalSubmissions.id, submissionId));
  if (!row || row.clientId !== ctx.user.clientId) throw new TRPCError({ code: "NOT_FOUND" });
  return { projectId: row.projectId, subject: row.subject };
}

/** Insert a portal submission scoped to the client and log it to the activity feed. */
async function insertSubmission(
  ctx: { db: DB; user: { id: string; fullName: string; clientId: string } },
  entry: {
    projectId: string;
    kind: "ACKNOWLEDGEMENT" | "CHANGE_REQUEST" | "FEEDBACK" | "MEETING_REQUEST";
    objectType?: string | null;
    objectId?: string | null;
    subject: string;
    body?: string | null;
    rating?: number | null;
    revisionCategory?: string | null;
    attentionToId?: string | null;
    refDrawingId?: string | null;
    eventSummary: string;
  },
): Promise<{ ok: true; id: string }> {
  const [created] = await ctx.db
    .insert(portalSubmissions)
    .values({
      projectId: entry.projectId,
      clientId: ctx.user.clientId,
      kind: entry.kind,
      objectType: entry.objectType ?? null,
      objectId: entry.objectId ?? null,
      subject: entry.subject,
      body: entry.body ?? null,
      rating: entry.rating ?? null,
      revisionCategory: entry.revisionCategory ?? null,
      attentionToId: entry.attentionToId ?? null,
      refDrawingId: entry.refDrawingId ?? null,
      submittedById: ctx.user.id,
    })
    .returning({ id: portalSubmissions.id });

  await writeActivity(ctx.db, {
    projectId: entry.projectId,
    objectType: "portal_submission",
    objectId: created!.id,
    eventType: `portal.${entry.kind.toLowerCase()}`,
    actorId: ctx.user.id,
    actorName: ctx.user.fullName,
    visibility: "ALL",
    summary: entry.eventSummary,
    metadata: {
      kind: entry.kind,
      rating: entry.rating ?? null,
      revisionCategory: entry.revisionCategory ?? null,
    },
  });
  return { ok: true as const, id: created!.id };
}
