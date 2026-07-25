import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * Steel reconciliation — scheduled (from BBS) vs issued vs consumed kg by
 * diameter. Consultancy site-checking; wastage = issued − consumed.
 */

export const SteelReconStatus = z.enum(["DRAFT", "FINALIZED"]);
export type SteelReconStatus = z.infer<typeof SteelReconStatus>;

export const STEEL_RECON_STATUS_LABEL: Record<SteelReconStatus, string> = {
  DRAFT: "Draft",
  FINALIZED: "Finalized",
};

export const STEEL_RECON_STATUS_TAG: Record<SteelReconStatus, TagColor> = {
  DRAFT: "cool-gray",
  FINALIZED: "green",
};

export const SteelWastageSeverity = z.enum(["WITHIN_LIMIT", "WARNING", "EXCEEDED"]);
export type SteelWastageSeverity = z.infer<typeof SteelWastageSeverity>;

export const STEEL_WASTAGE_SEVERITY_LABEL: Record<SteelWastageSeverity, string> = {
  WITHIN_LIMIT: "Within limit",
  WARNING: "Watch",
  EXCEEDED: "Over limit",
};

export const STEEL_WASTAGE_SEVERITY_TAG: Record<SteelWastageSeverity, TagColor> = {
  WITHIN_LIMIT: "green",
  WARNING: "magenta",
  EXCEEDED: "red",
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function steelWastageSeverity(
  wastagePct: number,
  opts: { warnPct?: number; exceedPct?: number } = {},
): SteelWastageSeverity {
  const warnPct = opts.warnPct ?? 3;
  const exceedPct = opts.exceedPct ?? 5;
  if (wastagePct > exceedPct) return "EXCEEDED";
  if (wastagePct > warnPct) return "WARNING";
  return "WITHIN_LIMIT";
}

export function steelReconLineVariance(input: {
  scheduledKg: number;
  issuedKg: number;
  consumedKg: number;
}): {
  wastageKg: number;
  wastagePct: number;
  issuedVsScheduledKg: number;
  issuedVsScheduledPct: number;
  severity: SteelWastageSeverity;
} {
  const wastageKg = round2(input.issuedKg - input.consumedKg);
  const wastagePct = input.issuedKg > 0 ? round2((wastageKg / input.issuedKg) * 100) : 0;
  const issuedVsScheduledKg = round2(input.issuedKg - input.scheduledKg);
  const issuedVsScheduledPct =
    input.scheduledKg > 0 ? round2((issuedVsScheduledKg / input.scheduledKg) * 100) : 0;
  return {
    wastageKg,
    wastagePct,
    issuedVsScheduledKg,
    issuedVsScheduledPct,
    severity: steelWastageSeverity(wastagePct),
  };
}

export function steelReconTotals(
  lines: { scheduledKg: number; issuedKg: number; consumedKg: number }[],
): { scheduledKg: number; issuedKg: number; consumedKg: number; wastageKg: number } {
  const t = lines.reduce(
    (acc, l) => {
      acc.scheduledKg += l.scheduledKg;
      acc.issuedKg += l.issuedKg;
      acc.consumedKg += l.consumedKg;
      return acc;
    },
    { scheduledKg: 0, issuedKg: 0, consumedKg: 0 },
  );
  return {
    scheduledKg: round2(t.scheduledKg),
    issuedKg: round2(t.issuedKg),
    consumedKg: round2(t.consumedKg),
    wastageKg: round2(t.issuedKg - t.consumedKg),
  };
}

export const SteelReconCreate = z.object({
  projectId: z.string().uuid(),
  bbsId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});
export type SteelReconCreate = z.infer<typeof SteelReconCreate>;

export const SteelReconSeedFromBbs = z.object({
  reconciliationId: z.string().uuid(),
  bbsId: z.string().uuid(),
});
export type SteelReconSeedFromBbs = z.infer<typeof SteelReconSeedFromBbs>;

export const SteelReconLineInput = z.object({
  reconciliationId: z.string().uuid(),
  diaMm: z.number().positive(),
  scheduledKg: z.number().nonnegative().default(0),
  issuedKg: z.number().nonnegative().default(0),
  consumedKg: z.number().nonnegative().default(0),
});
export type SteelReconLineInput = z.infer<typeof SteelReconLineInput>;

export const SteelReconLineUpdate = z.object({
  id: z.string().uuid(),
  reconciliationId: z.string().uuid(),
  scheduledKg: z.number().nonnegative().optional(),
  issuedKg: z.number().nonnegative().optional(),
  consumedKg: z.number().nonnegative().optional(),
});
export type SteelReconLineUpdate = z.infer<typeof SteelReconLineUpdate>;

export const SteelReconLineRemove = z.object({
  id: z.string().uuid(),
  reconciliationId: z.string().uuid(),
});
export type SteelReconLineRemove = z.infer<typeof SteelReconLineRemove>;

export const SteelReconFinalize = z.object({
  id: z.string().uuid(),
});
export type SteelReconFinalize = z.infer<typeof SteelReconFinalize>;
