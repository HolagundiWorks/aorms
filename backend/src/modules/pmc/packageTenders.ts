import {
  PmcPackageAward,
  PmcPackageInviteCreate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  contractors,
  pmcPackageBids,
  pmcPackageInvites,
  pmcPackages,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

async function loadPackage(db: DB, id: string, projectId: string) {
  const [pkg] = await db.select().from(pmcPackages).where(eq(pmcPackages.id, id));
  if (!pkg || pkg.projectId !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
  }
  return pkg;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bids are sealed until PMC opens them (or package is no longer tendering). */
function bidsAreSealed(pkg: { status: string; bidsOpenedAt: Date | null }): boolean {
  if (pkg.bidsOpenedAt) return false;
  return pkg.status === "TENDERING" || pkg.status === "DRAFT";
}

export const pmcPackageTendersRouter = router({
  listInvites: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), packageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await loadPackage(ctx.db, input.packageId, input.projectId);
      return ctx.db
        .select({
          id: pmcPackageInvites.id,
          packageId: pmcPackageInvites.packageId,
          contractorId: pmcPackageInvites.contractorId,
          contractorName: contractors.name,
          status: pmcPackageInvites.status,
          notes: pmcPackageInvites.notes,
          invitedAt: pmcPackageInvites.invitedAt,
        })
        .from(pmcPackageInvites)
        .innerJoin(contractors, eq(contractors.id, pmcPackageInvites.contractorId))
        .where(eq(pmcPackageInvites.packageId, input.packageId))
        .orderBy(asc(pmcPackageInvites.invitedAt));
    }),

  invite: manage.input(PmcPackageInviteCreate).mutation(async ({ ctx, input }) => {
    const pkg = await loadPackage(ctx.db, input.packageId, input.projectId);
    if (pkg.status === "CANCELLED" || pkg.status === "COMPLETE") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot invite on a closed package",
      });
    }
    const [contractor] = await ctx.db
      .select({ id: contractors.id, active: contractors.active })
      .from(contractors)
      .where(eq(contractors.id, input.contractorId));
    if (!contractor?.active) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contractor not found or inactive" });
    }

    const [existing] = await ctx.db
      .select({ id: pmcPackageInvites.id, status: pmcPackageInvites.status })
      .from(pmcPackageInvites)
      .where(
        and(
          eq(pmcPackageInvites.packageId, input.packageId),
          eq(pmcPackageInvites.contractorId, input.contractorId),
        ),
      );
    if (existing?.status === "INVITED") {
      throw new TRPCError({ code: "CONFLICT", message: "Contractor already invited" });
    }

    let invite;
    if (existing) {
      [invite] = await ctx.db
        .update(pmcPackageInvites)
        .set({
          status: "INVITED",
          notes: input.notes ?? null,
          invitedById: ctx.user.id,
          invitedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pmcPackageInvites.id, existing.id))
        .returning();
    } else {
      [invite] = await ctx.db
        .insert(pmcPackageInvites)
        .values({
          packageId: input.packageId,
          contractorId: input.contractorId,
          notes: input.notes ?? null,
          invitedById: ctx.user.id,
          status: "INVITED",
        })
        .returning();
    }

    const startTendering = input.startTendering !== false;
    if (startTendering && (pkg.status === "DRAFT" || pkg.status === "TENDERING")) {
      await ctx.db
        .update(pmcPackages)
        .set({ status: "TENDERING", updatedAt: new Date() })
        .where(eq(pmcPackages.id, input.packageId));
    }

    await writeAudit(ctx.db, {
      entity: "pmc_package_invite",
      entityId: invite!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { packageId: input.packageId, contractorId: input.contractorId },
    });
    return invite!;
  }),

  withdrawInvite: manage
    .input(
      z.object({
        projectId: z.string().uuid(),
        packageId: z.string().uuid(),
        inviteId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadPackage(ctx.db, input.packageId, input.projectId);
      const [before] = await ctx.db
        .select()
        .from(pmcPackageInvites)
        .where(
          and(
            eq(pmcPackageInvites.id, input.inviteId),
            eq(pmcPackageInvites.packageId, input.packageId),
          ),
        );
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(pmcPackageInvites)
        .set({ status: "WITHDRAWN", updatedAt: new Date() })
        .where(eq(pmcPackageInvites.id, input.inviteId))
        .returning();
      await writeAudit(ctx.db, {
        entity: "pmc_package_invite",
        entityId: input.inviteId,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: "WITHDRAWN" },
      });
      return row!;
    }),

  /**
   * List bids for a package. While sealed, amounts and cover notes are omitted —
   * only contractor identity + submission presence is returned.
   */
  listBids: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), packageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pkg = await loadPackage(ctx.db, input.packageId, input.projectId);
      const sealed = bidsAreSealed(pkg);
      const rows = await ctx.db
        .select({
          id: pmcPackageBids.id,
          packageId: pmcPackageBids.packageId,
          contractorId: pmcPackageBids.contractorId,
          contractorName: contractors.name,
          amountPaise: pmcPackageBids.amountPaise,
          coverNote: pmcPackageBids.coverNote,
          validityDays: pmcPackageBids.validityDays,
          status: pmcPackageBids.status,
          submittedAt: pmcPackageBids.submittedAt,
        })
        .from(pmcPackageBids)
        .innerJoin(contractors, eq(contractors.id, pmcPackageBids.contractorId))
        .where(
          and(eq(pmcPackageBids.packageId, input.packageId), ne(pmcPackageBids.status, "WITHDRAWN")),
        )
        .orderBy(asc(pmcPackageBids.submittedAt));

      if (sealed) {
        return {
          sealed: true as const,
          bidsOpenedAt: pkg.bidsOpenedAt,
          tenderCloseDate: pkg.tenderCloseDate,
          submittedCount: rows.filter((r) => r.status === "SUBMITTED").length,
          bids: rows.map((r) => ({
            id: r.id,
            packageId: r.packageId,
            contractorId: r.contractorId,
            contractorName: r.contractorName,
            status: r.status,
            submittedAt: r.submittedAt,
            amountPaise: null as number | null,
            coverNote: null as string | null,
            validityDays: null as number | null,
          })),
        };
      }

      return {
        sealed: false as const,
        bidsOpenedAt: pkg.bidsOpenedAt,
        tenderCloseDate: pkg.tenderCloseDate,
        submittedCount: rows.filter((r) => r.status === "SUBMITTED").length,
        bids: rows,
      };
    }),

  /** Unseal bids so staff can compare amounts. Prefer after tender close. */
  openBids: manage
    .input(z.object({ projectId: z.string().uuid(), packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await loadPackage(ctx.db, input.packageId, input.projectId);
      if (pkg.bidsOpenedAt) {
        return { ok: true as const, bidsOpenedAt: pkg.bidsOpenedAt };
      }
      if (pkg.tenderCloseDate && pkg.tenderCloseDate > todayIso()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tender closes on ${pkg.tenderCloseDate}. Open after close, or clear the close date first.`,
        });
      }
      const openedAt = new Date();
      await ctx.db
        .update(pmcPackages)
        .set({ bidsOpenedAt: openedAt, updatedAt: openedAt })
        .where(eq(pmcPackages.id, input.packageId));
      await writeAudit(ctx.db, {
        entity: "pmc_package",
        entityId: input.packageId,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: { bidsOpenedAt: openedAt.toISOString() },
      });
      return { ok: true as const, bidsOpenedAt: openedAt };
    }),

  award: manage.input(PmcPackageAward).mutation(async ({ ctx, input }) => {
    const pkg = await loadPackage(ctx.db, input.packageId, input.projectId);
    if (pkg.status === "CANCELLED" || pkg.status === "COMPLETE") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Package is closed" });
    }
    if (bidsAreSealed(pkg)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Open bids before awarding",
      });
    }
    const [bid] = await ctx.db
      .select()
      .from(pmcPackageBids)
      .where(
        and(eq(pmcPackageBids.id, input.bidId), eq(pmcPackageBids.packageId, input.packageId)),
      );
    if (!bid || bid.status !== "SUBMITTED") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bid not found" });
    }

    const awardDate = todayIso();
    await ctx.db
      .update(pmcPackages)
      .set({
        status: "AWARDED",
        contractorId: bid.contractorId,
        contractValuePaise: bid.amountPaise,
        awardDate,
        updatedAt: new Date(),
      })
      .where(eq(pmcPackages.id, input.packageId));

    await ctx.db
      .update(pmcPackageBids)
      .set({ status: "AWARDED", updatedAt: new Date() })
      .where(eq(pmcPackageBids.id, bid.id));

    await ctx.db
      .update(pmcPackageBids)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(
        and(
          eq(pmcPackageBids.packageId, input.packageId),
          ne(pmcPackageBids.id, bid.id),
          eq(pmcPackageBids.status, "SUBMITTED"),
        ),
      );

    await writeAudit(ctx.db, {
      entity: "pmc_package",
      entityId: input.packageId,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: {
        status: "AWARDED",
        contractorId: bid.contractorId,
        bidId: bid.id,
        amountPaise: bid.amountPaise,
      },
    });
    return { ok: true as const, awardDate, contractorId: bid.contractorId };
  }),
});
