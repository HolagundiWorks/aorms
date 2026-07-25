import {
  RUNNING_BILL_STATUS_LABEL,
  RunningBillAddItem,
  RunningBillAdvance,
  RunningBillCreate,
  RunningBillUpdateDeductions,
  billLineAmountPaise,
  canAdvanceRunningBill,
  netPayablePaise,
  type RunningBillStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { contractors, projectOffices, runningBillItems, runningBills } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");
const certify = capabilityProcedure("cost:approve");

async function loadBill(db: DB, id: string) {
  const [row] = await db.select().from(runningBills).where(eq(runningBills.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Running bill not found" });
  return row;
}

function assertEditable(status: string) {
  if (status !== "DRAFT" && status !== "SITE_CHECKED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Only draft or site-checked bills can be edited.",
    });
  }
}

async function recomputeBill(db: DB, billId: string) {
  const [bill] = await db.select().from(runningBills).where(eq(runningBills.id, billId));
  if (!bill) return;
  const items = await db
    .select()
    .from(runningBillItems)
    .where(eq(runningBillItems.runningBillId, billId));
  const totalPaise = items.reduce((s, i) => s + i.amountPaise, 0);
  const netPayablePaiseVal = netPayablePaise(totalPaise, bill);
  await db
    .update(runningBills)
    .set({
      totalPaise,
      netPayablePaise: netPayablePaiseVal,
      updatedAt: new Date(),
    })
    .where(eq(runningBills.id, billId));
}

export const runningBillsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(runningBills)
        .where(eq(runningBills.projectId, input.projectId))
        .orderBy(desc(runningBills.createdAt)),
    ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bill = await loadBill(ctx.db, input.id).catch(() => null);
      if (!bill) return null;
      const items = await ctx.db
        .select()
        .from(runningBillItems)
        .where(eq(runningBillItems.runningBillId, input.id))
        .orderBy(asc(runningBillItems.sortOrder), asc(runningBillItems.createdAt));
      return { bill, items };
    }),

  create: manage.input(RunningBillCreate).mutation(async ({ ctx, input }) => {
    const [project] = await ctx.db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    if (input.contractorId) {
      const [c] = await ctx.db
        .select({ id: contractors.id })
        .from(contractors)
        .where(eq(contractors.id, input.contractorId));
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Contractor not found" });
    }

    const { ref } = await nextRef(ctx.db, "runningbill", "RA");
    const d = input.deductions ?? {
      retentionPaise: 0,
      advanceRecoveryPaise: 0,
      taxTdsPaise: 0,
      otherRecoveryPaise: 0,
    };
    const lineRows = input.items.map((it, i) => {
      const amountPaise = billLineAmountPaise(it.qty, it.ratePaise);
      return {
        sortOrder: i,
        description: it.description.trim(),
        unit: it.unit.trim(),
        qty: it.qty,
        ratePaise: it.ratePaise,
        amountPaise,
        previousBilledQty: it.previousBilledQty,
        cumulativeBilledQty: it.previousBilledQty + it.qty,
      };
    });
    const totalPaise = lineRows.reduce((s, r) => s + r.amountPaise, 0);
    const retentionPaise = d.retentionPaise ?? 0;
    const advanceRecoveryPaise = d.advanceRecoveryPaise ?? 0;
    const taxTdsPaise = d.taxTdsPaise ?? 0;
    const otherRecoveryPaise = d.otherRecoveryPaise ?? 0;
    const net = netPayablePaise(totalPaise, {
      retentionPaise,
      advanceRecoveryPaise,
      taxTdsPaise,
      otherRecoveryPaise,
    });

    const history = [
      {
        status: "DRAFT",
        label: RUNNING_BILL_STATUS_LABEL.DRAFT,
        actorId: ctx.user.id,
        at: new Date().toISOString(),
      },
    ];

    const [bill] = await ctx.db
      .insert(runningBills)
      .values({
        ref,
        projectId: input.projectId,
        contractorId: input.contractorId ?? null,
        title: input.title.trim(),
        billType: input.billType,
        status: "DRAFT",
        measurementDate: input.measurementDate ?? null,
        notes: input.notes?.trim() || null,
        totalPaise,
        retentionPaise,
        advanceRecoveryPaise,
        taxTdsPaise,
        otherRecoveryPaise,
        netPayablePaise: net,
        statusHistory: history,
        createdById: ctx.user.id,
      })
      .returning();

    await ctx.db.insert(runningBillItems).values(
      lineRows.map((r) => ({ ...r, runningBillId: bill!.id })),
    );

    await writeAudit(ctx.db, {
      entity: "running_bill",
      entityId: bill!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: bill,
    });
    return bill!;
  }),

  addItem: manage.input(RunningBillAddItem).mutation(async ({ ctx, input }) => {
    const bill = await loadBill(ctx.db, input.runningBillId);
    assertEditable(bill.status);
    const prior = await ctx.db
      .select({ id: runningBillItems.id })
      .from(runningBillItems)
      .where(eq(runningBillItems.runningBillId, input.runningBillId));
    const amountPaise = billLineAmountPaise(input.qty, input.ratePaise);
    const [row] = await ctx.db
      .insert(runningBillItems)
      .values({
        runningBillId: input.runningBillId,
        sortOrder: prior.length,
        description: input.description.trim(),
        unit: input.unit.trim(),
        qty: input.qty,
        ratePaise: input.ratePaise,
        amountPaise,
        previousBilledQty: input.previousBilledQty,
        cumulativeBilledQty: input.previousBilledQty + input.qty,
      })
      .returning();
    await recomputeBill(ctx.db, input.runningBillId);
    return row!;
  }),

  removeItem: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(runningBillItems)
        .where(eq(runningBillItems.id, input.id));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const bill = await loadBill(ctx.db, item.runningBillId);
      assertEditable(bill.status);
      await ctx.db.delete(runningBillItems).where(eq(runningBillItems.id, input.id));
      await recomputeBill(ctx.db, item.runningBillId);
      return { ok: true as const };
    }),

  updateDeductions: manage.input(RunningBillUpdateDeductions).mutation(async ({ ctx, input }) => {
    const bill = await loadBill(ctx.db, input.id);
    assertEditable(bill.status);
    const d = input.deductions;
    const net = netPayablePaise(bill.totalPaise, d);
    const [row] = await ctx.db
      .update(runningBills)
      .set({
        retentionPaise: d.retentionPaise,
        advanceRecoveryPaise: d.advanceRecoveryPaise,
        taxTdsPaise: d.taxTdsPaise,
        otherRecoveryPaise: d.otherRecoveryPaise,
        netPayablePaise: net,
        updatedAt: new Date(),
      })
      .where(eq(runningBills.id, input.id))
      .returning();
    return row!;
  }),

  /** Certify / forward / close — L2+ (`cost:approve`). Use `siteCheck` for site step. */
  advance: certify.input(RunningBillAdvance).mutation(async ({ ctx, input }) => {
    if (input.status === "SITE_CHECKED" || input.status === "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use siteCheck for site-checked, or edit while draft.",
      });
    }
    const bill = await loadBill(ctx.db, input.id);
    if (!canAdvanceRunningBill(bill.status, input.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move from ${bill.status} to ${input.status}.`,
      });
    }

    const history = Array.isArray(bill.statusHistory) ? [...bill.statusHistory] : [];
    history.push({
      status: input.status,
      label: RUNNING_BILL_STATUS_LABEL[input.status as RunningBillStatus],
      actorId: ctx.user.id,
      note: input.note ?? null,
      at: new Date().toISOString(),
    });

    const [row] = await ctx.db
      .update(runningBills)
      .set({
        status: input.status,
        statusHistory: history,
        updatedAt: new Date(),
      })
      .where(eq(runningBills.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "running_bill",
      entityId: input.id,
      action: "STATUS",
      actorId: ctx.user.id,
      before: { status: bill.status },
      after: { status: input.status },
    });
    return row!;
  }),

  /** Site-check can be done by write (site engineer). */
  siteCheck: manage
    .input(z.object({ id: z.string().uuid(), note: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const bill = await loadBill(ctx.db, input.id);
      if (!canAdvanceRunningBill(bill.status, "SITE_CHECKED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot site-check from ${bill.status}.`,
        });
      }
      const history = Array.isArray(bill.statusHistory) ? [...bill.statusHistory] : [];
      history.push({
        status: "SITE_CHECKED",
        label: RUNNING_BILL_STATUS_LABEL.SITE_CHECKED,
        actorId: ctx.user.id,
        note: input.note ?? null,
        at: new Date().toISOString(),
      });
      const [row] = await ctx.db
        .update(runningBills)
        .set({ status: "SITE_CHECKED", statusHistory: history, updatedAt: new Date() })
        .where(eq(runningBills.id, input.id))
        .returning();
      return row!;
    }),

  remove: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const bill = await loadBill(ctx.db, input.id);
      if (bill.status !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft bills can be deleted.",
        });
      }
      await ctx.db.delete(runningBills).where(eq(runningBills.id, input.id));
      return { ok: true as const };
    }),
});
