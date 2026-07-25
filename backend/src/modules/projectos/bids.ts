import {
  BidCreate,
  BidOpenAsLead,
  BidSetStatus,
  BidUpdate,
  canTransitionBidStatus,
  LeadCreate,
  type BidStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bidOpportunities, leads } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const clean = (v: string | null | undefined): string | null =>
  v && v.trim() ? v.trim() : null;

function parseDue(v: string | null | undefined): Date | null {
  const s = clean(v);
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T23:59:59.000Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Bid desk — firm-as-bidder RFP / tender opportunities.
 * Contractor tendering (esti_tender*) stays removed.
 */
export const bidsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(bidOpportunities)
        .orderBy(desc(bidOpportunities.createdAt));
      return input?.status ? rows.filter((r) => r.status === input.status) : rows;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(bidOpportunities)
        .where(eq(bidOpportunities.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure.input(BidCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "bid", "BID");
    const [row] = await ctx.db
      .insert(bidOpportunities)
      .values({
        ref,
        title: input.title.trim(),
        issuerName: input.issuerName.trim(),
        referenceNo: clean(input.referenceNo),
        source: input.source ?? "TENDER_PORTAL",
        portalUrl: clean(input.portalUrl),
        submissionDueAt: parseDue(input.submissionDueAt),
        emdPaise: input.emdPaise ?? null,
        estimatedFeePaise: input.estimatedFeePaise ?? null,
        siteLocation: clean(input.siteLocation),
        city: clean(input.city),
        leadId: input.leadId ?? null,
        notes: clean(input.notes),
        ownerId: ctx.user.id,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "bid_opportunity",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: protectedProcedure.input(BidUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(bidOpportunities)
      .where(eq(bidOpportunities.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });

    const [row] = await ctx.db
      .update(bidOpportunities)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.issuerName !== undefined ? { issuerName: input.issuerName.trim() } : {}),
        ...(input.referenceNo !== undefined ? { referenceNo: clean(input.referenceNo) } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.portalUrl !== undefined ? { portalUrl: clean(input.portalUrl) } : {}),
        ...(input.submissionDueAt !== undefined
          ? { submissionDueAt: parseDue(input.submissionDueAt) }
          : {}),
        ...(input.emdPaise !== undefined ? { emdPaise: input.emdPaise } : {}),
        ...(input.estimatedFeePaise !== undefined
          ? { estimatedFeePaise: input.estimatedFeePaise }
          : {}),
        ...(input.siteLocation !== undefined ? { siteLocation: clean(input.siteLocation) } : {}),
        ...(input.city !== undefined ? { city: clean(input.city) } : {}),
        ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
        ...(input.notes !== undefined ? { notes: clean(input.notes) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(bidOpportunities.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "bid_opportunity",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),

  setStatus: protectedProcedure.input(BidSetStatus).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(bidOpportunities)
      .where(eq(bidOpportunities.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canTransitionBidStatus(before.status, input.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move bid from ${before.status} to ${input.status}.`,
      });
    }
    const [row] = await ctx.db
      .update(bidOpportunities)
      .set({
        status: input.status,
        ...(input.status === "LOST" && input.lossReason
          ? { lossReason: clean(input.lossReason) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(bidOpportunities.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "bid_opportunity",
      entityId: input.id,
      action: "STATUS",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: input.status as BidStatus },
    });
    return row!;
  }),

  /**
   * Create a Studio lead from this bid (if none linked) so the win path continues
   * into the existing Leads → Proposals → Project funnel.
   */
  openAsLead: protectedProcedure.input(BidOpenAsLead).mutation(async ({ ctx, input }) => {
    if (!input.conflictCheckDone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Confirm the COA conflict check before opening a lead.",
      });
    }
    const [bid] = await ctx.db
      .select()
      .from(bidOpportunities)
      .where(eq(bidOpportunities.id, input.id));
    if (!bid) throw new TRPCError({ code: "NOT_FOUND" });
    if (bid.leadId) {
      const [existing] = await ctx.db.select().from(leads).where(eq(leads.id, bid.leadId));
      return { bid, lead: existing ?? null };
    }

    const { ref } = await nextRef(ctx.db, "lead", "LDR");
    const leadPayload = LeadCreate.parse({
      clientName: bid.issuerName,
      leadSource: "COLD_OUTREACH",
      projectType: bid.title,
      siteLocation: bid.siteLocation ?? undefined,
      city: bid.city ?? undefined,
      notes: [
        `Opened from bid ${bid.ref}`,
        bid.referenceNo ? `Tender ref: ${bid.referenceNo}` : null,
        bid.portalUrl ? `Portal: ${bid.portalUrl}` : null,
        bid.notes,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const [lead] = await ctx.db
      .insert(leads)
      .values({
        ref,
        clientName: leadPayload.clientName,
        leadSource: leadPayload.leadSource,
        projectType: leadPayload.projectType ?? null,
        siteLocation: leadPayload.siteLocation ?? null,
        city: leadPayload.city ?? null,
        notes: leadPayload.notes ?? null,
        conflictCheckDone: true,
        conflictCheckNotes: clean(input.conflictCheckNotes),
        createdById: ctx.user.id,
      })
      .returning();

    const [updated] = await ctx.db
      .update(bidOpportunities)
      .set({
        leadId: lead!.id,
        conflictCheckDone: true,
        conflictCheckNotes: clean(input.conflictCheckNotes),
        status: bid.status === "WATCHING" || bid.status === "REVIEWING" ? "PREPARING" : bid.status,
        updatedAt: new Date(),
      })
      .where(eq(bidOpportunities.id, bid.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "bid_opportunity",
      entityId: bid.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { leadId: lead!.id },
    });
    await writeAudit(ctx.db, {
      entity: "lead",
      entityId: lead!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: lead,
    });
    return { bid: updated!, lead: lead! };
  }),
});
