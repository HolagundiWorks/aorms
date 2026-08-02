import {
  PMC_RA_TRANSITIONS,
  PmcRaBillCreate,
  PmcRaBillTransition,
  PmcRaBillUpdate,
  can,
  pmcRaLineAmountPaise,
  pmcRaNetPayablePaise,
  type PmcRaBillStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { pmcPackages, pmcRaBills, pmcRaLines, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");
const certify = capabilityProcedure("cost:approve");

function assertEditable(status: string) {
  if (status !== "DRAFT" && status !== "SITE_CHECKED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only draft or site-checked bills can be edited",
    });
  }
}

function rollup(lines: { thisQty: number; ratePaise: number }[], d: {
  advanceRecoveryPaise: number;
  retentionPaise: number;
  otherDeductionPaise: number;
}) {
  const grossPaise = lines.reduce(
    (s, l) => s + pmcRaLineAmountPaise(l.thisQty, l.ratePaise),
    0,
  );
  const netPaise = pmcRaNetPayablePaise({
    grossPaise,
    advanceRecoveryPaise: d.advanceRecoveryPaise,
    retentionPaise: d.retentionPaise,
    otherDeductionPaise: d.otherDeductionPaise,
  });
  return { grossPaise, netPaise };
}

async function loadBill(db: DB, id: string) {
  const [bill] = await db.select().from(pmcRaBills).where(eq(pmcRaBills.id, id));
  if (!bill) return null;
  const lines = await db
    .select()
    .from(pmcRaLines)
    .where(eq(pmcRaLines.billId, id))
    .orderBy(asc(pmcRaLines.sortOrder));
  const netPaise = pmcRaNetPayablePaise({
    grossPaise: bill.grossPaise,
    advanceRecoveryPaise: bill.advanceRecoveryPaise,
    retentionPaise: bill.retentionPaise,
    otherDeductionPaise: bill.otherDeductionPaise,
  });
  return { ...bill, lines, netPaise };
}

export const pmcRaBillsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bills = await ctx.db
        .select()
        .from(pmcRaBills)
        .where(eq(pmcRaBills.projectId, input.projectId))
        .orderBy(desc(pmcRaBills.periodEnd), desc(pmcRaBills.createdAt));
      return bills.map((b) => ({
        ...b,
        netPaise: pmcRaNetPayablePaise({
          grossPaise: b.grossPaise,
          advanceRecoveryPaise: b.advanceRecoveryPaise,
          retentionPaise: b.retentionPaise,
          otherDeductionPaise: b.otherDeductionPaise,
        }),
      }));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bill = await loadBill(ctx.db, input.id);
      if (!bill || bill.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return bill;
    }),

  portfolioOpen: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: pmcRaBills.id,
        projectId: pmcRaBills.projectId,
        projectTitle: projectOffices.title,
        projectRef: projectOffices.ref,
        ref: pmcRaBills.ref,
        billNo: pmcRaBills.billNo,
        status: pmcRaBills.status,
        periodEnd: pmcRaBills.periodEnd,
        grossPaise: pmcRaBills.grossPaise,
      })
      .from(pmcRaBills)
      .innerJoin(projectOffices, eq(pmcRaBills.projectId, projectOffices.id))
      .where(
        and(
          isNull(projectOffices.archivedAt),
          inArray(pmcRaBills.status, ["DRAFT", "SITE_CHECKED", "CERTIFIED"]),
        ),
      )
      .orderBy(desc(pmcRaBills.updatedAt))
      .limit(40);
    return rows;
  }),

  create: manage.input(PmcRaBillCreate).mutation(async ({ ctx, input }) => {
    if (input.packageId) {
      const [pkg] = await ctx.db
        .select({ id: pmcPackages.id, projectId: pmcPackages.projectId })
        .from(pmcPackages)
        .where(eq(pmcPackages.id, input.packageId));
      if (!pkg || pkg.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package not on this project" });
      }
    }
    const advance = input.advanceRecoveryPaise ?? 0;
    const retention = input.retentionPaise ?? 0;
    const other = input.otherDeductionPaise ?? 0;
    const { grossPaise } = rollup(
      input.lines.map((l) => ({ thisQty: l.thisQty, ratePaise: l.ratePaise })),
      { advanceRecoveryPaise: advance, retentionPaise: retention, otherDeductionPaise: other },
    );
    const { ref } = await nextRef(ctx.db, "pmc_ra_bill", "RA");
    const [bill] = await ctx.db
      .insert(pmcRaBills)
      .values({
        projectId: input.projectId,
        packageId: input.packageId ?? null,
        ref,
        billNo: input.billNo,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: "DRAFT",
        grossPaise,
        advanceRecoveryPaise: advance,
        retentionPaise: retention,
        otherDeductionPaise: other,
        otherDeductionNote: input.otherDeductionNote ?? null,
        gstNote: input.gstNote ?? null,
        tdsNote: input.tdsNote ?? null,
        narrative: input.narrative ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await ctx.db.insert(pmcRaLines).values(
      input.lines.map((l, i) => ({
        billId: bill!.id,
        sortOrder: i,
        description: l.description,
        unit: l.unit ?? null,
        previousQty: l.previousQty ?? 0,
        thisQty: l.thisQty,
        ratePaise: l.ratePaise,
        amountPaise: pmcRaLineAmountPaise(l.thisQty, l.ratePaise),
      })),
    );
    await writeAudit(ctx.db, {
      entity: "pmc_ra_bill",
      entityId: bill!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, billNo: input.billNo, grossPaise },
    });
    return loadBill(ctx.db, bill!.id);
  }),

  update: manage.input(PmcRaBillUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(pmcRaBills).where(eq(pmcRaBills.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    assertEditable(before.status);
    if (input.packageId) {
      const [pkg] = await ctx.db
        .select({ id: pmcPackages.id, projectId: pmcPackages.projectId })
        .from(pmcPackages)
        .where(eq(pmcPackages.id, input.packageId));
      if (!pkg || pkg.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package not on this project" });
      }
    }

    let grossPaise = before.grossPaise;
    if (input.lines) {
      await ctx.db.delete(pmcRaLines).where(eq(pmcRaLines.billId, input.id));
      await ctx.db.insert(pmcRaLines).values(
        input.lines.map((l, i) => ({
          billId: input.id,
          sortOrder: i,
          description: l.description,
          unit: l.unit ?? null,
          previousQty: l.previousQty ?? 0,
          thisQty: l.thisQty,
          ratePaise: l.ratePaise,
          amountPaise: pmcRaLineAmountPaise(l.thisQty, l.ratePaise),
        })),
      );
      grossPaise = input.lines.reduce(
        (s, l) => s + pmcRaLineAmountPaise(l.thisQty, l.ratePaise),
        0,
      );
    }

    await ctx.db
      .update(pmcRaBills)
      .set({
        ...(input.packageId !== undefined ? { packageId: input.packageId } : {}),
        ...(input.billNo !== undefined ? { billNo: input.billNo } : {}),
        ...(input.periodStart !== undefined ? { periodStart: input.periodStart } : {}),
        ...(input.periodEnd !== undefined ? { periodEnd: input.periodEnd } : {}),
        ...(input.narrative !== undefined ? { narrative: input.narrative } : {}),
        ...(input.advanceRecoveryPaise !== undefined
          ? { advanceRecoveryPaise: input.advanceRecoveryPaise }
          : {}),
        ...(input.retentionPaise !== undefined ? { retentionPaise: input.retentionPaise } : {}),
        ...(input.otherDeductionPaise !== undefined
          ? { otherDeductionPaise: input.otherDeductionPaise }
          : {}),
        ...(input.otherDeductionNote !== undefined
          ? { otherDeductionNote: input.otherDeductionNote }
          : {}),
        ...(input.gstNote !== undefined ? { gstNote: input.gstNote } : {}),
        ...(input.tdsNote !== undefined ? { tdsNote: input.tdsNote } : {}),
        grossPaise,
        updatedAt: new Date(),
      })
      .where(and(eq(pmcRaBills.id, input.id), eq(pmcRaBills.projectId, input.projectId)));

    await writeAudit(ctx.db, {
      entity: "pmc_ra_bill",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { grossPaise },
    });
    return loadBill(ctx.db, input.id);
  }),

  transition: manage.input(PmcRaBillTransition).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(pmcRaBills).where(eq(pmcRaBills.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const from = before.status as PmcRaBillStatus;
    const allowed = PMC_RA_TRANSITIONS[from] ?? [];
    if (!allowed.includes(input.to)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move from ${from} to ${input.to}`,
      });
    }
    if (input.to === "CERTIFIED" && !can(ctx.user.role, "cost:approve")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Certification requires cost:approve",
      });
    }

    const [row] = await ctx.db
      .update(pmcRaBills)
      .set({
        status: input.to,
        ...(input.to === "CERTIFIED"
          ? { certifiedAt: new Date(), certifiedById: ctx.user.id }
          : {}),
        ...(input.to === "SENT_TO_CLIENT" ? { sentAt: new Date() } : {}),
        ...(input.to === "DRAFT"
          ? { certifiedAt: null, certifiedById: null, sentAt: null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(pmcRaBills.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "pmc_ra_bill",
      entityId: input.id,
      action: "TRANSITION",
      actorId: ctx.user.id,
      before: { status: from },
      after: { status: input.to },
    });
    return row!;
  }),

  /** Certify shortcut — requires cost:approve. */
  certify: certify
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(pmcRaBills).where(eq(pmcRaBills.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (before.status !== "SITE_CHECKED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only site-checked bills can be certified",
        });
      }
      const [row] = await ctx.db
        .update(pmcRaBills)
        .set({
          status: "CERTIFIED",
          certifiedAt: new Date(),
          certifiedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(pmcRaBills.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "pmc_ra_bill",
        entityId: input.id,
        action: "CERTIFY",
        actorId: ctx.user.id,
      });
      return row!;
    }),

  generatePdf: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(pmcRaBills).where(eq(pmcRaBills.id, input.id));
      if (!row || row.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (row.status === "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Site-check or certify before generating PDF",
        });
      }
      await ctx.db
        .update(pmcRaBills)
        .set({ pdfStatus: "PENDING", updatedAt: new Date() })
        .where(eq(pmcRaBills.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "pmc_ra_bill", id: row.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      await writeAudit(ctx.db, {
        entity: "pmc_ra_bill",
        entityId: input.id,
        action: "PDF",
        actorId: ctx.user.id,
      });
      return { ok: true as const };
    }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(pmcRaBills).where(eq(pmcRaBills.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (before.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft bills can be deleted" });
      }
      await ctx.db.delete(pmcRaBills).where(eq(pmcRaBills.id, input.id));
      await writeAudit(ctx.db, {
        entity: "pmc_ra_bill",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: before.ref },
      });
      return { ok: true as const };
    }),
});
