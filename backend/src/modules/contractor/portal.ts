import {
  CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL,
  ContractorPortalSubmitInput,
  TenderBidSubmit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  contractorSubmissions,
  firm,
  phases,
  projectOffices,
  siteVisits,
  tenderBids,
  tenderInvitations,
  tenders,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import {
  portalIssuedTransmittals,
  portalPublishedRunningBills,
  portalReadyDrawings,
} from "../../lib/sync/hubPortal.js";
import { contractorProcedure, contractorWriteProcedure, router } from "../../trpc/trpc.js";
import type { DB } from "../../db/index.js";

async function invitationProject(
  db: DB,
  contractorId: string,
  invitationId: string,
): Promise<{ projectId: string; projectTitle: string; invitationId: string }> {
  const [row] = await db
    .select({
      invitationId: tenderInvitations.id,
      projectId: projectOffices.id,
      projectTitle: projectOffices.title,
    })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
    .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
    .where(
      and(
        eq(tenderInvitations.id, invitationId),
        eq(tenderInvitations.contractorId, contractorId),
      ),
    );
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

/**
 * Contractor portal — invited tenders, sealed bids, and site coordination tickets.
 * Scoped strictly by `ctx.user.contractorId`.
 */
export const contractorPortalRouter = router({
  branding: contractorProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ companyName: firm.companyName, logoKey: firm.logoKey })
      .from(firm)
      .limit(1);
    return {
      companyName: row?.companyName ?? "AORMS",
      logoKey: row?.logoKey ?? null,
    };
  }),

  myTenders: contractorProcedure.query(async ({ ctx }) => {
    const contractorId = ctx.user.contractorId!;
    return ctx.db
      .select({
        invitationId: tenderInvitations.id,
        invitationStatus: tenderInvitations.status,
        invitedAt: tenderInvitations.invitedAt,
        tenderId: tenders.id,
        title: tenders.title,
        category: tenders.category,
        status: tenders.status,
        dueDate: tenders.dueDate,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
      })
      .from(tenderInvitations)
      .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
      .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
      .where(eq(tenderInvitations.contractorId, contractorId))
      .orderBy(desc(tenderInvitations.invitedAt));
  }),

  getInvitation: contractorProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const [row] = await ctx.db
        .select({
          invitationId: tenderInvitations.id,
          invitationStatus: tenderInvitations.status,
          invitedAt: tenderInvitations.invitedAt,
          viewedAt: tenderInvitations.viewedAt,
          tenderId: tenders.id,
          title: tenders.title,
          category: tenders.category,
          scope: tenders.scope,
          tenderStatus: tenders.status,
          dueDate: tenders.dueDate,
          instructions: tenders.instructions,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
        })
        .from(tenderInvitations)
        .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
        .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
        .where(
          and(
            eq(tenderInvitations.id, input.invitationId),
            eq(tenderInvitations.contractorId, contractorId),
          ),
        );
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      let invitationStatus = row.invitationStatus;
      let viewedAt = row.viewedAt;
      if (invitationStatus === "INVITED") {
        await ctx.db
          .update(tenderInvitations)
          .set({ status: "VIEWED", viewedAt: new Date() })
          .where(eq(tenderInvitations.id, input.invitationId));
        invitationStatus = "VIEWED";
        viewedAt = new Date();
      }

      const [bid] = await ctx.db
        .select()
        .from(tenderBids)
        .where(eq(tenderBids.invitationId, input.invitationId));

      return {
        invitationId: row.invitationId,
        invitationStatus,
        invitedAt: row.invitedAt,
        viewedAt,
        tender: {
          id: row.tenderId,
          title: row.title,
          category: row.category,
          scope: row.scope,
          status: row.tenderStatus,
          dueDate: row.dueDate,
          instructions: row.instructions,
        },
        projectRef: row.projectRef,
        projectTitle: row.projectTitle,
        bid: bid ?? null,
        canBid: row.tenderStatus === "OPEN" && invitationStatus !== "DECLINED",
      };
    }),

  /**
   * Project summary + stages + issued drawings for an invitation the contractor holds.
   * Scoped by invitation → tender → project (S10 firm portal depth).
   */
  projectDetail: contractorProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const [row] = await ctx.db
        .select({
          projectId: projectOffices.id,
          ref: projectOffices.ref,
          title: projectOffices.title,
          status: projectOffices.status,
          projectType: projectOffices.projectType,
          jurisdiction: projectOffices.jurisdiction,
          currentPhaseId: projectOffices.currentPhaseId,
        })
        .from(tenderInvitations)
        .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
        .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
        .where(
          and(
            eq(tenderInvitations.id, input.invitationId),
            eq(tenderInvitations.contractorId, contractorId),
          ),
        );
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const phaseRows = await ctx.db
        .select({
          id: phases.id,
          code: phases.code,
          label: phases.label,
          billingPct: phases.billingPct,
          sortOrder: phases.sortOrder,
        })
        .from(phases)
        .where(eq(phases.projectId, row.projectId))
        .orderBy(asc(phases.sortOrder));
      const currentSortOrder =
        phaseRows.find((p) => p.id === row.currentPhaseId)?.sortOrder ?? -1;

      const drawingRows = await portalReadyDrawings(ctx.db, row.projectId);
      const transmittalRows = await portalIssuedTransmittals(ctx.db, row.projectId);

      return {
        project: {
          ref: row.ref,
          title: row.title,
          status: row.status,
          projectType: row.projectType,
          jurisdiction: row.jurisdiction,
        },
        phases: phaseRows.map((ph) => ({
          code: ph.code,
          label: ph.label,
          billingPct: ph.billingPct,
          status:
            ph.sortOrder < currentSortOrder
              ? "Complete"
              : ph.id === row.currentPhaseId
                ? "Active"
                : "Pending",
        })),
        drawings: drawingRows,
        transmittals: transmittalRows.map((t) => ({
          id: t.id,
          ref: t.ref,
          purpose: t.purpose,
          channel: t.channel,
          dateIssued: t.dateIssued,
        })),
      };
    }),

  submitBid: contractorWriteProcedure.input(TenderBidSubmit).mutation(async ({ ctx, input }) => {
    const contractorId = ctx.user.contractorId!;
    const [inv] = await ctx.db
      .select({
        invitationId: tenderInvitations.id,
        invitationStatus: tenderInvitations.status,
        tenderStatus: tenders.status,
      })
      .from(tenderInvitations)
      .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
      .where(
        and(
          eq(tenderInvitations.id, input.invitationId),
          eq(tenderInvitations.contractorId, contractorId),
        ),
      );
    if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
    if (inv.tenderStatus !== "OPEN") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Bidding is only open while the tender is OPEN.",
      });
    }
    if (inv.invitationStatus === "DECLINED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "You declined this invitation.",
      });
    }

    const [existing] = await ctx.db
      .select()
      .from(tenderBids)
      .where(eq(tenderBids.invitationId, input.invitationId));

    let bid;
    if (existing) {
      [bid] = await ctx.db
        .update(tenderBids)
        .set({
          amountPaise: input.amountPaise,
          completionWeeks: input.completionWeeks ?? null,
          notes: input.notes?.trim() || null,
          submittedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(tenderBids.id, existing.id))
        .returning();
    } else {
      [bid] = await ctx.db
        .insert(tenderBids)
        .values({
          invitationId: input.invitationId,
          amountPaise: input.amountPaise,
          completionWeeks: input.completionWeeks ?? null,
          notes: input.notes?.trim() || null,
          submittedById: ctx.user.id,
        })
        .returning();
    }

    await ctx.db
      .update(tenderInvitations)
      .set({ status: "SUBMITTED" })
      .where(eq(tenderInvitations.id, input.invitationId));

    await writeAudit(ctx.db, {
      entity: "tender_bid",
      entityId: bid!.id,
      action: existing ? "UPDATE" : "CREATE",
      actorId: ctx.user.id,
      after: { invitationId: input.invitationId, amountPaise: input.amountPaise },
    });
    return bid!;
  }),

  decline: contractorWriteProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const [inv] = await ctx.db
        .select()
        .from(tenderInvitations)
        .where(
          and(
            eq(tenderInvitations.id, input.invitationId),
            eq(tenderInvitations.contractorId, contractorId),
          ),
        );
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      if (inv.status === "SUBMITTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot decline after submitting a bid.",
        });
      }
      const [row] = await ctx.db
        .update(tenderInvitations)
        .set({ status: "DECLINED" })
        .where(eq(tenderInvitations.id, input.invitationId))
        .returning();
      await writeAudit(ctx.db, {
        entity: "tender_invitation",
        entityId: input.invitationId,
        action: "DECLINE",
        actorId: ctx.user.id,
      });
      return row!;
    }),

  /** Certified / sent RA bills for the invitation's project (Documents tab). */
  myRunningBills: contractorProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const { projectId } = await invitationProject(ctx.db, contractorId, input.invitationId);
      return portalPublishedRunningBills(ctx.db, projectId);
    }),

  mySubmissions: contractorProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const { projectId } = await invitationProject(ctx.db, contractorId, input.invitationId);
      return ctx.db
        .select({
          id: contractorSubmissions.id,
          kind: contractorSubmissions.kind,
          subject: contractorSubmissions.subject,
          body: contractorSubmissions.body,
          status: contractorSubmissions.status,
          responseNote: contractorSubmissions.responseNote,
          createdAt: contractorSubmissions.createdAt,
        })
        .from(contractorSubmissions)
        .where(
          and(
            eq(contractorSubmissions.projectId, projectId),
            eq(contractorSubmissions.contractorId, contractorId),
          ),
        )
        .orderBy(desc(contractorSubmissions.createdAt));
    }),

  /**
   * Raise a coordination ticket (ticket · RFI · drawing · meeting · site visit ·
   * joint measurement). Site-visit requests also create a PLANNED `esti_site_visit`.
   */
  submitRequest: contractorWriteProcedure
    .input(ContractorPortalSubmitInput)
    .mutation(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId!;
      const { projectId, projectTitle } = await invitationProject(
        ctx.db,
        contractorId,
        input.invitationId,
      );

      const kindLabel = CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[input.kind];
      const bodyParts = [
        input.body?.trim() || null,
        input.preferredDate ? `Preferred date: ${input.preferredDate}` : null,
      ].filter(Boolean);

      const [row] = await ctx.db
        .insert(contractorSubmissions)
        .values({
          projectId,
          contractorId,
          kind: input.kind,
          subject: input.subject.trim(),
          body: bodyParts.length > 0 ? bodyParts.join("\n\n") : null,
          status: "OPEN",
          submittedById: ctx.user.id,
        })
        .returning();

      if (
        (input.kind === "SITE_VISIT_REQUEST" || input.kind === "JOINT_MEASUREMENT") &&
        input.preferredDate
      ) {
        await ctx.db.insert(siteVisits).values({
          projectId,
          plannedDate: input.preferredDate,
          contractorId,
          status: "PLANNED",
          notes:
            input.kind === "JOINT_MEASUREMENT"
              ? `Joint measurement request — ${input.subject.trim()}`
              : `Site visit request — ${input.subject.trim()}`,
          createdById: ctx.user.id,
        });
      }

      await writeAudit(ctx.db, {
        entity: "contractor_submission",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: {
          kind: input.kind,
          projectId,
          projectTitle,
          invitationId: input.invitationId,
        },
      });
      return row!;
    }),
});
