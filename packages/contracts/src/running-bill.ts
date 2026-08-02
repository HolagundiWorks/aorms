import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * Running / RA bills — architect certification of contractor bills on a project.
 * Free-form (or estimate-linked) lines + deductions; no work-package spine.
 * Money in integer paise.
 */

export const RunningBillStatus = z.enum([
  "DRAFT",
  "SITE_CHECKED",
  "CERTIFIED",
  "SENT_TO_CLIENT",
  "CLOSED",
]);
export type RunningBillStatus = z.infer<typeof RunningBillStatus>;

export const RUNNING_BILL_STATUS_LABEL: Record<RunningBillStatus, string> = {
  DRAFT: "Draft",
  SITE_CHECKED: "Site checked",
  CERTIFIED: "Certified",
  SENT_TO_CLIENT: "Sent to client",
  CLOSED: "Closed",
};

export const RUNNING_BILL_STATUS_TAG: Record<RunningBillStatus, TagColor> = {
  DRAFT: "cool-gray",
  SITE_CHECKED: "blue",
  CERTIFIED: "teal",
  SENT_TO_CLIENT: "purple",
  CLOSED: "green",
};

export const RUNNING_BILL_STATUS_TRANSITIONS: Record<
  RunningBillStatus,
  readonly RunningBillStatus[]
> = {
  DRAFT: ["SITE_CHECKED"],
  SITE_CHECKED: ["CERTIFIED", "DRAFT"],
  CERTIFIED: ["SENT_TO_CLIENT", "SITE_CHECKED"],
  SENT_TO_CLIENT: ["CLOSED"],
  CLOSED: [],
};

export function canAdvanceRunningBill(from: string, to: string): boolean {
  const allowed = RUNNING_BILL_STATUS_TRANSITIONS[from as RunningBillStatus];
  return !!allowed && allowed.includes(to as RunningBillStatus);
}

export const BillType = z.enum([
  "RA",
  "FINAL",
  "EXTRA_ITEM",
  "VARIATION",
  "ADVANCE_RECOVERY",
  "RETENTION_RELEASE",
]);
export type BillType = z.infer<typeof BillType>;

export const BILL_TYPE_LABEL: Record<BillType, string> = {
  RA: "Running account (RA)",
  FINAL: "Final bill",
  EXTRA_ITEM: "Extra item",
  VARIATION: "Variation",
  ADVANCE_RECOVERY: "Advance recovery",
  RETENTION_RELEASE: "Retention release",
};

export const BillDeductions = z.object({
  retentionPaise: z.number().int().nonnegative().default(0),
  advanceRecoveryPaise: z.number().int().nonnegative().default(0),
  taxTdsPaise: z.number().int().nonnegative().default(0),
  otherRecoveryPaise: z.number().int().nonnegative().default(0),
});
export type BillDeductions = z.infer<typeof BillDeductions>;

export function billLineAmountPaise(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}

export function netPayablePaise(
  grossPaise: number,
  d: {
    retentionPaise?: number | null;
    advanceRecoveryPaise?: number | null;
    taxTdsPaise?: number | null;
    otherRecoveryPaise?: number | null;
  },
): number {
  const deductions =
    (d.retentionPaise ?? 0) +
    (d.advanceRecoveryPaise ?? 0) +
    (d.taxTdsPaise ?? 0) +
    (d.otherRecoveryPaise ?? 0);
  return Math.max(0, grossPaise - deductions);
}

export const RunningBillItemInput = z.object({
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  qty: z.number().nonnegative(),
  ratePaise: z.number().int().nonnegative().default(0),
  previousBilledQty: z.number().nonnegative().default(0),
});
export type RunningBillItemInput = z.infer<typeof RunningBillItemInput>;

export const RunningBillCreate = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  billType: BillType.default("RA"),
  measurementDate: z.string().date().optional(),
  notes: z.string().max(4000).optional(),
  deductions: BillDeductions.optional(),
  items: z.array(RunningBillItemInput).min(1).max(200),
});
export type RunningBillCreate = z.infer<typeof RunningBillCreate>;

export const RunningBillUpdateDeductions = z.object({
  id: z.string().uuid(),
  deductions: BillDeductions,
});
export type RunningBillUpdateDeductions = z.infer<typeof RunningBillUpdateDeductions>;

export const RunningBillAddItem = RunningBillItemInput.extend({
  runningBillId: z.string().uuid(),
});
export type RunningBillAddItem = z.infer<typeof RunningBillAddItem>;

export const RunningBillAdvance = z.object({
  id: z.string().uuid(),
  status: RunningBillStatus,
  note: z.string().max(2000).optional(),
});
export type RunningBillAdvance = z.infer<typeof RunningBillAdvance>;
