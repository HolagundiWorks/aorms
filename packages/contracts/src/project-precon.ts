/**
 * AORMS-Studio pre-construction R&O — project risk, opportunity, phase gates.
 * (The doc this used to cite, docs/esti/AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md,
 * does not exist anywhere in the repo — a broken pointer, flagged not
 * guessed at.)
 *
 * The shared risk/opportunity/phase-gate enums, labels, and the phase-gate
 * decision rule below were originally defined in the (now-removed)
 * consultancy module and reused here — this file is their sole home now.
 */
import { z } from "zod";
import type { TagColor } from "./schemas.js";

export const RiskStatus = z.enum(["OPEN", "MITIGATED", "CLOSED"]);
export type RiskStatus = z.infer<typeof RiskStatus>;

export const CONS_RISK_STATUS_TAG: Record<RiskStatus, TagColor> = {
  OPEN: "red",
  MITIGATED: "teal",
  CLOSED: "gray",
};

export const RiskResponse = z.enum(["AVOID", "REDUCE", "TRANSFER", "ACCEPT"]);
export type RiskResponse = z.infer<typeof RiskResponse>;

export const RISK_RESPONSE_LABEL: Record<RiskResponse, string> = {
  AVOID: "Avoid",
  REDUCE: "Reduce",
  TRANSFER: "Transfer",
  ACCEPT: "Accept",
};

export const OpportunitySource = z.enum([
  "WORKSHOP",
  "DESIGN_REVIEW",
  "SITE",
  "LESSONS",
  "EXPERT",
  "MARKET",
  "OTHER",
]);
export type OpportunitySource = z.infer<typeof OpportunitySource>;

export const OpportunityArea = z.enum([
  "BUSINESS_CASE",
  "STAKEHOLDER",
  "SITE",
  "PLANNING",
  "DESIGN",
  "BUILDABILITY",
  "PROCUREMENT",
  "COST",
  "SCHEDULE",
  "CONTRACT",
  "SUSTAINABILITY",
  "DIGITAL",
]);
export type OpportunityArea = z.infer<typeof OpportunityArea>;

export const OPPORTUNITY_AREA_LABEL: Record<OpportunityArea, string> = {
  BUSINESS_CASE: "Business case",
  STAKEHOLDER: "Stakeholder",
  SITE: "Site / inputs",
  PLANNING: "Planning & approvals",
  DESIGN: "Design",
  BUILDABILITY: "Buildability / coordination",
  PROCUREMENT: "Procurement (consultant)",
  COST: "Cost / fee",
  SCHEDULE: "Programme",
  CONTRACT: "Contract",
  SUSTAINABILITY: "Sustainability",
  DIGITAL: "Digital engineering",
};

export const OpportunityResponse = z.enum(["EXPLOIT", "ENHANCE", "SHARE", "ACCEPT"]);
export type OpportunityResponse = z.infer<typeof OpportunityResponse>;

export const OPPORTUNITY_RESPONSE_LABEL: Record<OpportunityResponse, string> = {
  EXPLOIT: "Exploit",
  ENHANCE: "Enhance",
  SHARE: "Share",
  ACCEPT: "Accept",
};

export const OpportunityStatus = z.enum(["OPEN", "IN_PROGRESS", "REALIZED", "CLOSED"]);
export type OpportunityStatus = z.infer<typeof OpportunityStatus>;

export const CONS_OPPORTUNITY_STATUS_TAG: Record<OpportunityStatus, TagColor> = {
  OPEN: "teal",
  IN_PROGRESS: "blue",
  REALIZED: "green",
  CLOSED: "gray",
};

/** Score = probability × impact (1–25). */
export function opportunityScore(probability: number, impact: number): number {
  return Math.max(1, Math.min(5, probability)) * Math.max(1, Math.min(5, impact));
}

export function opportunityPriority(
  probability: number,
  impact: number,
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const s = opportunityScore(probability, impact);
  if (s >= 20) return "CRITICAL";
  if (s >= 12) return "HIGH";
  if (s >= 6) return "MEDIUM";
  return "LOW";
}

export const ConsPhaseGateKey = z.enum([
  "CONCEPT",
  "SCHEMATIC",
  "DETAILED",
  "ISSUE_READINESS",
]);
export type ConsPhaseGateKey = z.infer<typeof ConsPhaseGateKey>;

export const CONS_PHASE_GATE_LABEL: Record<ConsPhaseGateKey, string> = {
  CONCEPT: "Concept",
  SCHEMATIC: "Schematic",
  DETAILED: "Detailed design",
  ISSUE_READINESS: "Issue readiness",
};

/** Shared checklist items for design phase gates. */
export const CONSULTANCY_PHASE_GATE_CHECKLIST = [
  { key: "scopeDefined", label: "Scope clearly defined" },
  { key: "designCoordinated", label: "Design sufficiently complete and coordinated" },
  { key: "risksMitigated", label: "Major risks have mitigation or acceptance" },
  { key: "opportunitiesReviewed", label: "Key opportunities evaluated" },
  { key: "feeApproved", label: "Fee / budget path approved and achievable" },
  { key: "programmeRealistic", label: "Phase programme / milestones realistic" },
  { key: "permitsTracked", label: "Required permits / approvals obtained or tracked" },
  { key: "inputsValidated", label: "Critical input packs validated" },
  { key: "contractReviewed", label: "Contract / reliance strategy reviewed" },
  { key: "stageReady", label: "Engagement ready for next design stage / issue" },
] as const;

export type ConsPhaseGateChecklistKey = (typeof CONSULTANCY_PHASE_GATE_CHECKLIST)[number]["key"];

export const ConsPhaseGateDecision = z.enum(["PENDING", "GO", "HOLD", "NO_GO"]);
export type ConsPhaseGateDecision = z.infer<typeof ConsPhaseGateDecision>;

/** GO requires every shared checklist item true. HOLD/NO_GO/PENDING always allowed. */
export function canDecidePhaseGate(args: {
  decision: ConsPhaseGateDecision;
  checklist: Record<string, boolean>;
}): { ok: true } | { ok: false; reason: string; missing: string[] } {
  if (args.decision !== "GO") return { ok: true };
  const missing = CONSULTANCY_PHASE_GATE_CHECKLIST.filter((c) => !args.checklist[c.key]).map(
    (c) => c.label,
  );
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    reason: `GO blocked — complete: ${missing.join("; ")}.`,
    missing,
  };
}

const score = z.number().int().min(1).max(5);

export const ProjectRiskCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  likelihood: score.default(3),
  impact: score.default(3),
  owner: z.string().trim().max(200).optional(),
  response: RiskResponse.default("REDUCE"),
  mitigation: z.string().trim().max(2000).optional(),
  residualLikelihood: score.optional(),
  residualImpact: score.optional(),
});
export type ProjectRiskCreate = z.infer<typeof ProjectRiskCreate>;

export const ProjectRiskUpdate = ProjectRiskCreate.omit({ projectId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: RiskStatus.optional(),
  });
export type ProjectRiskUpdate = z.infer<typeof ProjectRiskUpdate>;

export const ProjectOpportunityCreate = z.object({
  projectId: z.string().uuid(),
  linkedRiskId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  source: OpportunitySource.default("WORKSHOP"),
  area: OpportunityArea.default("DESIGN"),
  probability: score.default(3),
  impact: score.default(3),
  response: OpportunityResponse.default("ENHANCE"),
  owner: z.string().trim().max(200).optional(),
  actionPlan: z.string().trim().max(4000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  valueNote: z.string().trim().max(2000).optional(),
  estimatedValuePaise: z.number().int().nonnegative().optional(),
});
export type ProjectOpportunityCreate = z.infer<typeof ProjectOpportunityCreate>;

export const ProjectOpportunityUpdate = ProjectOpportunityCreate.omit({ projectId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: OpportunityStatus.optional(),
  });
export type ProjectOpportunityUpdate = z.infer<typeof ProjectOpportunityUpdate>;

export const ProjectPhaseGateUpsert = z.object({
  projectId: z.string().uuid(),
  gateKey: ConsPhaseGateKey,
  phaseId: z.string().uuid().optional(),
  checklist: z.record(z.string(), z.boolean()).default({}),
  decision: ConsPhaseGateDecision.default("PENDING"),
  notes: z.string().trim().max(4000).optional(),
});
export type ProjectPhaseGateUpsert = z.infer<typeof ProjectPhaseGateUpsert>;
