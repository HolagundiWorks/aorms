import { TenderBidSubmit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  projectOffices,
  tenderBids,
  tenderInvitations,
  tenders,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { contractorProcedure, contractorWriteProcedure, router } from "../../trpc/trpc.js";

/**
 * Contractor portal — invited tenders and sealed lump-sum bids.
 * Scoped strictly by `ctx.user.contractorId`.
 */
export const contractorPortalRouter = router({
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
});
