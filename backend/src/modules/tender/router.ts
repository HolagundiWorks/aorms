import {
  canTransitionTenderStatus,
  TenderAward,
  TenderCreate,
  TenderInvite,
  TenderSetStatus,
  TenderUpdate,
  tenderBidsVisibleToFirm,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  contractors,
  projectOffices,
  tenderBids,
  tenderInvitations,
  tenders,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const clean = (v: string | null | undefined): string | null =>
  v && v.trim() ? v.trim() : null;
const manage = capabilityProcedure("write");

async function loadTender(db: DB, id: string) {
  const [row] = await db.select().from(tenders).where(eq(tenders.id, id));
  return row ?? null;
}

/**
 * Firm-side tendering — issue tenders on a project, invite contractors, review
 * sealed bids after close, award. Contractors submit via `contractorPortal`.
 */
export const tendersRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(tenders)
        .where(eq(tenders.projectId, input.projectId))
        .orderBy(desc(tenders.createdAt));
    }),

  listOpen: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: tenders.id,
        projectId: tenders.projectId,
        title: tenders.title,
        status: tenders.status,
        dueDate: tenders.dueDate,
        category: tenders.category,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
      })
      .from(tenders)
      .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
      .where(eq(tenders.status, "OPEN"))
      .orderBy(desc(tenders.updatedAt));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tender = await loadTender(ctx.db, input.id);
      if (!tender) return null;
      const invitations = await ctx.db
        .select({
          id: tenderInvitations.id,
          contractorId: tenderInvitations.contractorId,
          status: tenderInvitations.status,
          invitedAt: tenderInvitations.invitedAt,
          viewedAt: tenderInvitations.viewedAt,
          contractorName: contractors.name,
          contractorCategory: contractors.category,
        })
        .from(tenderInvitations)
        .innerJoin(contractors, eq(tenderInvitations.contractorId, contractors.id))
        .where(eq(tenderInvitations.tenderId, tender.id));

      const showAmounts = tenderBidsVisibleToFirm(tender.status);
      const bidRows = await ctx.db
        .select({
          id: tenderBids.id,
          invitationId: tenderBids.invitationId,
          amountPaise: tenderBids.amountPaise,
          completionWeeks: tenderBids.completionWeeks,
          notes: tenderBids.notes,
          createdAt: tenderBids.createdAt,
        })
        .from(tenderBids)
        .innerJoin(tenderInvitations, eq(tenderBids.invitationId, tenderInvitations.id))
        .where(eq(tenderInvitations.tenderId, tender.id));

      const bids = bidRows.map((b) => ({
        ...b,
        amountPaise: showAmounts ? b.amountPaise : null,
        notes: showAmounts ? b.notes : null,
        sealed: !showAmounts,
      }));

      return { tender, invitations, bids, bidsSealed: !showAmounts };
    }),

  create: manage.input(TenderCreate).mutation(async ({ ctx, input }) => {
    const [project] = await ctx.db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    const [row] = await ctx.db
      .insert(tenders)
      .values({
        projectId: input.projectId,
        title: input.title.trim(),
        category: clean(input.category),
        scope: clean(input.scope),
        dueDate: input.dueDate ?? null,
        instructions: clean(input.instructions),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(TenderUpdate).mutation(async ({ ctx, input }) => {
    const before = await loadTender(ctx.db, input.id);
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.status !== "DRAFT") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Only draft tenders can be edited.",
      });
    }
    const [row] = await ctx.db
      .update(tenders)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.category !== undefined ? { category: clean(input.category) } : {}),
        ...(input.scope !== undefined ? { scope: clean(input.scope) } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.instructions !== undefined
          ? { instructions: clean(input.instructions) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),

  setStatus: manage.input(TenderSetStatus).mutation(async ({ ctx, input }) => {
    const before = await loadTender(ctx.db, input.id);
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (input.status === "AWARDED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use award to pick a winning contractor after closing.",
      });
    }
    if (!canTransitionTenderStatus(before.status, input.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move tender from ${before.status} to ${input.status}.`,
      });
    }
    if (input.status === "OPEN") {
      const invites = await ctx.db
        .select({ id: tenderInvitations.id })
        .from(tenderInvitations)
        .where(eq(tenderInvitations.tenderId, input.id));
      if (invites.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Invite at least one contractor before opening the tender.",
        });
      }
    }
    const [row] = await ctx.db
      .update(tenders)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(tenders.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: input.id,
      action: "STATUS",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: input.status },
    });
    return row!;
  }),

  invite: manage.input(TenderInvite).mutation(async ({ ctx, input }) => {
    const tender = await loadTender(ctx.db, input.tenderId);
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    if (tender.status === "AWARDED" || tender.status === "CANCELLED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot invite on an awarded or cancelled tender.",
      });
    }
    const [contractor] = await ctx.db
      .select({ id: contractors.id, active: contractors.active })
      .from(contractors)
      .where(eq(contractors.id, input.contractorId));
    if (!contractor) throw new TRPCError({ code: "NOT_FOUND", message: "Contractor not found" });
    if (!contractor.active) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contractor is inactive." });
    }

    const [existing] = await ctx.db
      .select()
      .from(tenderInvitations)
      .where(
        and(
          eq(tenderInvitations.tenderId, input.tenderId),
          eq(tenderInvitations.contractorId, input.contractorId),
        ),
      );
    if (existing) return existing;

    const [row] = await ctx.db
      .insert(tenderInvitations)
      .values({
        tenderId: input.tenderId,
        contractorId: input.contractorId,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "tender_invitation",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  removeInvitation: manage
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await ctx.db
        .select()
        .from(tenderInvitations)
        .where(eq(tenderInvitations.id, input.invitationId));
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      if (inv.status === "SUBMITTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot remove an invitation after a bid was submitted.",
        });
      }
      const tender = await loadTender(ctx.db, inv.tenderId);
      if (tender && (tender.status === "AWARDED" || tender.status === "CLOSED")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot remove invitations after the tender is closed.",
        });
      }
      await ctx.db.delete(tenderInvitations).where(eq(tenderInvitations.id, input.invitationId));
      await writeAudit(ctx.db, {
        entity: "tender_invitation",
        entityId: input.invitationId,
        action: "DELETE",
        actorId: ctx.user.id,
        before: inv,
      });
      return { ok: true as const };
    }),

  award: manage.input(TenderAward).mutation(async ({ ctx, input }) => {
    const tender = await loadTender(ctx.db, input.tenderId);
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    if (tender.status !== "CLOSED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Close the tender to unseal bids, then award.",
      });
    }
    const [inv] = await ctx.db
      .select()
      .from(tenderInvitations)
      .where(
        and(
          eq(tenderInvitations.tenderId, input.tenderId),
          eq(tenderInvitations.contractorId, input.contractorId),
          eq(tenderInvitations.status, "SUBMITTED"),
        ),
      );
    if (!inv) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Award requires a submitted bid from that contractor.",
      });
    }
    const [row] = await ctx.db
      .update(tenders)
      .set({
        status: "AWARDED",
        awardedContractorId: input.contractorId,
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, input.tenderId))
      .returning();
    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: input.tenderId,
      action: "AWARD",
      actorId: ctx.user.id,
      after: { awardedContractorId: input.contractorId },
    });
    return row!;
  }),
});
