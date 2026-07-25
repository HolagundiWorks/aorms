import { PmcPackageBidSubmit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  firm,
  pmcPackageBids,
  pmcPackageInvites,
  pmcPackages,
  projectOffices,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import {
  contractorProcedure,
  contractorWriteProcedure,
  router,
} from "../../trpc/trpc.js";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tenderOpen(pkg: {
  status: string;
  tenderCloseDate: string | null;
}): boolean {
  if (pkg.status !== "TENDERING") return false;
  if (pkg.tenderCloseDate && pkg.tenderCloseDate < todayIso()) return false;
  return true;
}

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

  /** Active invites + any bid the contractor has placed. */
  myInvites: contractorProcedure.query(async ({ ctx }) => {
    const contractorId = ctx.user.contractorId;
    const invites = await ctx.db
      .select({
        inviteId: pmcPackageInvites.id,
        inviteStatus: pmcPackageInvites.status,
        invitedAt: pmcPackageInvites.invitedAt,
        inviteNotes: pmcPackageInvites.notes,
        packageId: pmcPackages.id,
        packageRef: pmcPackages.ref,
        packageTitle: pmcPackages.title,
        trade: pmcPackages.trade,
        packageStatus: pmcPackages.status,
        tenderCloseDate: pmcPackages.tenderCloseDate,
        awardDate: pmcPackages.awardDate,
        projectId: projectOffices.id,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
      })
      .from(pmcPackageInvites)
      .innerJoin(pmcPackages, eq(pmcPackages.id, pmcPackageInvites.packageId))
      .innerJoin(projectOffices, eq(projectOffices.id, pmcPackages.projectId))
      .where(
        and(
          eq(pmcPackageInvites.contractorId, contractorId),
          inArray(pmcPackageInvites.status, ["INVITED", "DECLINED"]),
        ),
      )
      .orderBy(asc(pmcPackageInvites.invitedAt));

    const packageIds = invites.map((i) => i.packageId);
    const bids =
      packageIds.length === 0
        ? []
        : await ctx.db
            .select()
            .from(pmcPackageBids)
            .where(
              and(
                eq(pmcPackageBids.contractorId, contractorId),
                inArray(pmcPackageBids.packageId, packageIds),
              ),
            );

    const bidByPackage = new Map(bids.map((b) => [b.packageId, b]));

    return invites.map((inv) => {
      const bid = bidByPackage.get(inv.packageId);
      return {
        ...inv,
        canBid: inv.inviteStatus === "INVITED" && tenderOpen({
          status: inv.packageStatus,
          tenderCloseDate: inv.tenderCloseDate,
        }),
        bid: bid
          ? {
              id: bid.id,
              amountPaise: bid.amountPaise,
              coverNote: bid.coverNote,
              validityDays: bid.validityDays,
              status: bid.status,
              submittedAt: bid.submittedAt,
            }
          : null,
      };
    });
  }),

  submitBid: contractorWriteProcedure
    .input(PmcPackageBidSubmit)
    .mutation(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId;
      const [invite] = await ctx.db
        .select()
        .from(pmcPackageInvites)
        .where(
          and(
            eq(pmcPackageInvites.packageId, input.packageId),
            eq(pmcPackageInvites.contractorId, contractorId),
            eq(pmcPackageInvites.status, "INVITED"),
          ),
        );
      if (!invite) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active invite for this package",
        });
      }

      const [pkg] = await ctx.db
        .select()
        .from(pmcPackages)
        .where(eq(pmcPackages.id, input.packageId));
      if (!pkg || !tenderOpen(pkg)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tender is closed",
        });
      }
      if (pkg.bidsOpenedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bids have been opened — no further submissions",
        });
      }

      const [existing] = await ctx.db
        .select()
        .from(pmcPackageBids)
        .where(
          and(
            eq(pmcPackageBids.packageId, input.packageId),
            eq(pmcPackageBids.contractorId, contractorId),
            eq(pmcPackageBids.status, "SUBMITTED"),
          ),
        );

      let row;
      if (existing) {
        [row] = await ctx.db
          .update(pmcPackageBids)
          .set({
            amountPaise: input.amountPaise,
            coverNote: input.coverNote ?? null,
            validityDays: input.validityDays ?? null,
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pmcPackageBids.id, existing.id))
          .returning();
      } else {
        [row] = await ctx.db
          .insert(pmcPackageBids)
          .values({
            packageId: input.packageId,
            inviteId: invite.id,
            contractorId,
            amountPaise: input.amountPaise,
            coverNote: input.coverNote ?? null,
            validityDays: input.validityDays ?? null,
            status: "SUBMITTED",
          })
          .returning();
      }

      await writeAudit(ctx.db, {
        entity: "pmc_package_bid",
        entityId: row!.id,
        action: existing ? "UPDATE" : "CREATE",
        actorId: ctx.user.id,
        after: { packageId: input.packageId, amountPaise: input.amountPaise },
      });
      return row!;
    }),

  withdrawBid: contractorWriteProcedure
    .input(z.object({ bidId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId;
      const [bid] = await ctx.db
        .select()
        .from(pmcPackageBids)
        .where(
          and(eq(pmcPackageBids.id, input.bidId), eq(pmcPackageBids.contractorId, contractorId)),
        );
      if (!bid) throw new TRPCError({ code: "NOT_FOUND" });
      if (bid.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bid cannot be withdrawn" });
      }

      const [pkg] = await ctx.db
        .select()
        .from(pmcPackages)
        .where(eq(pmcPackages.id, bid.packageId));
      if (pkg?.bidsOpenedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bids have been opened — cannot withdraw",
        });
      }

      const [row] = await ctx.db
        .update(pmcPackageBids)
        .set({
          status: "WITHDRAWN",
          withdrawnAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pmcPackageBids.id, bid.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "pmc_package_bid",
        entityId: bid.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: { status: "WITHDRAWN" },
      });
      return row!;
    }),

  declineInvite: contractorWriteProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const contractorId = ctx.user.contractorId;
      const [invite] = await ctx.db
        .select()
        .from(pmcPackageInvites)
        .where(
          and(
            eq(pmcPackageInvites.id, input.inviteId),
            eq(pmcPackageInvites.contractorId, contractorId),
          ),
        );
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      if (invite.status !== "INVITED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite is not active" });
      }
      const [row] = await ctx.db
        .update(pmcPackageInvites)
        .set({ status: "DECLINED", updatedAt: new Date() })
        .where(eq(pmcPackageInvites.id, invite.id))
        .returning();
      return row!;
    }),
});
