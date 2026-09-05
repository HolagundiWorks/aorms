/**
 * Project OS — pure business logic ported verbatim from
 * packages/contracts/src/{project-os,project-dna,pre-project-assessment,
 * negotiation,program}.ts. These are the load-bearing pure functions the
 * Phase 10 audit calls out explicitly: deterministic, no DB access, shared
 * between server-side enforcement and the UI's own hints/previews.
 */

// --- Activation gate (Slice K) — evaluateActivationGate() -------------------

export type ProjectStatus = "ENQUIRY" | "PROPOSAL" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export interface ActivationGateInput {
  status: ProjectStatus;
  hasDna: boolean;
  hasAssessment: boolean;
  feeApproved: boolean;
  onboardingComplete: boolean;
  advancePaid: boolean;
}

export interface ActivationGateCheck {
  key: string;
  label: string;
  ok: boolean;
}

export interface ActivationGateResult {
  ok: boolean;
  checks: ActivationGateCheck[];
  blockingReason: string | null;
}

/**
 * Evaluate whether a draft project may be activated. Pure: the caller feeds
 * it booleans gathered from the spine and enforces `ok`; the UI shows the
 * checklist. Ported verbatim from packages/contracts/src/project-os.ts.
 */
export function evaluateActivationGate(input: ActivationGateInput): ActivationGateResult {
  const checks: ActivationGateCheck[] = [
    { key: "status", label: "Project is in PROPOSAL stage", ok: input.status === "PROPOSAL" },
    { key: "dna", label: "Project DNA captured", ok: input.hasDna },
    { key: "assessment", label: "Pre-project assessment recorded", ok: input.hasAssessment },
    { key: "fee", label: "Fee proposal approved by client", ok: input.feeApproved },
    { key: "onboarding", label: "Client onboarding complete", ok: input.onboardingComplete },
    { key: "advance", label: "Advance payment received", ok: input.advancePaid },
  ];
  const firstFail = checks.find((c) => !c.ok);
  return {
    ok: !firstFail,
    checks,
    blockingReason: firstFail ? firstFail.label : null,
  };
}

// --- Pre-project assessment (Slice C) — computeAssessment() ----------------

export interface AssessmentDerived {
  siteAreaSqm: number;
  permissibleFarArea: number;
  setbackBuildableArea: number;
  coverageArea: number;
  actualGroundCoverage: number;
  possibleFloors: number;
  superBuiltupArea: number;
  estimatedProjectCostPaise: number;
}

export interface AssessmentInput {
  siteLength?: number | null;
  siteWidth?: number | null;
  manualArea?: number | null;
  farFactor: number;
  frontSetback?: number | null;
  rearSetback?: number | null;
  leftSetback?: number | null;
  rightSetback?: number | null;
  groundCoveragePct: number;
  superBuiltupFactor?: number | null;
  constructionRatePaise?: number | null;
}

const n = (v: number | null | undefined): number => (typeof v === "number" && isFinite(v) ? v : 0);

/**
 * Compute every derived feasibility figure from the operator inputs. Ported
 * verbatim from packages/contracts/src/pre-project-assessment.ts — the
 * server recomputes from raw inputs on every upsert rather than trusting a
 * client-sent derived value (same discipline as Phase 4's estimate-item
 * recompute and Phase 3's frozen-invoice snapshot).
 */
export function computeAssessment(input: AssessmentInput): AssessmentDerived {
  const length = n(input.siteLength);
  const width = n(input.siteWidth);
  const computedArea = length * width;
  const siteAreaSqm = n(input.manualArea) > 0 ? n(input.manualArea) : computedArea;

  const farFactor = n(input.farFactor);
  const permissibleFarArea = siteAreaSqm * farFactor;

  const netLength = Math.max(0, length - n(input.frontSetback) - n(input.rearSetback));
  const netWidth = Math.max(0, width - n(input.leftSetback) - n(input.rightSetback));
  const setbackBuildableArea = netLength * netWidth;

  const coverageArea = (siteAreaSqm * n(input.groundCoveragePct)) / 100;

  const hasDims = length > 0 && width > 0;
  const actualGroundCoverage = hasDims ? Math.min(setbackBuildableArea, coverageArea) : coverageArea;

  const possibleFloors = actualGroundCoverage > 0 ? permissibleFarArea / actualGroundCoverage : 0;

  const superBuiltupFactor = n(input.superBuiltupFactor) > 0 ? n(input.superBuiltupFactor) : 1;
  const superBuiltupArea = permissibleFarArea * superBuiltupFactor;

  const estimatedProjectCostPaise = Math.round(superBuiltupArea * n(input.constructionRatePaise));

  return {
    siteAreaSqm,
    permissibleFarArea,
    setbackBuildableArea,
    coverageArea,
    actualGroundCoverage,
    possibleFloors,
    superBuiltupArea,
    estimatedProjectCostPaise,
  };
}

// --- Project DNA risk scoring (Slice E) — computeRiskScore() ---------------

export type BudgetMode = "FLEXIBLE" | "MODERATE" | "STRICT" | "VERY_STRICT";
export type VastuRequirement = "NONE" | "PARTIAL" | "STRONG" | "STRICT_TRADITIONAL";
export type DesignFlexibility = "ARCHITECT_FREEDOM" | "APPROVAL_EVERY_STAGE" | "STRICT_REQUIREMENT";
export type DecisionMakers = "SINGLE_OWNER" | "COUPLE" | "FAMILY" | "PARTNERS" | "CORPORATE_COMMITTEE";
export type TimelineCriticality = "FLEXIBLE" | "MODERATE" | "STRICT" | "URGENT";
export type RevisionTolerance = "LOW" | "MODERATE" | "HIGH" | "UNLIMITED";

export type RiskBand = "LOW" | "MODERATE" | "COMPLEX" | "HIGH_FRICTION";
export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  LOW: "Low risk",
  MODERATE: "Moderate risk",
  COMPLEX: "Complex project",
  HIGH_FRICTION: "High-friction project",
};
export const RISK_BAND_TAG: Record<RiskBand, "green" | "teal" | "purple" | "red"> = {
  LOW: "green",
  MODERATE: "teal",
  COMPLEX: "purple",
  HIGH_FRICTION: "red",
};

export interface RiskFactor {
  key: string;
  label: string;
  points: number;
}

export interface RiskScore {
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
}

export const COMPLEX_JURISDICTIONS: ReadonlySet<string> = new Set([
  "BBMP", "BDA", "BMRDA", "CMDA", "HMDA", "MMRDA", "PMRDA", "GHMC",
]);

export function riskBandFor(score: number): RiskBand {
  if (score < 30) return "LOW";
  if (score < 60) return "MODERATE";
  if (score < 80) return "COMPLEX";
  return "HIGH_FRICTION";
}

export interface RiskScoreInput {
  budgetMode: BudgetMode;
  vastuRequirement: VastuRequirement;
  designFlexibility: DesignFlexibility;
  decisionMakers: DecisionMakers;
  timelineCriticality: TimelineCriticality;
  revisionTolerance: RevisionTolerance;
  jurisdiction?: string | null;
}

/**
 * Deterministic project-complexity score (0-100) from the DNA + jurisdiction.
 * Ported verbatim from packages/contracts/src/project-dna.ts.
 */
export function computeRiskScore(input: RiskScoreInput): RiskScore {
  const factors: RiskFactor[] = [];

  if (input.budgetMode === "STRICT" || input.budgetMode === "VERY_STRICT") {
    factors.push({ key: "budget", label: "Strict budget", points: 20 });
  }
  if (input.vastuRequirement === "STRONG" || input.vastuRequirement === "STRICT_TRADITIONAL") {
    factors.push({ key: "vastu", label: "Strict Vastu", points: 15 });
  }
  if (input.timelineCriticality === "URGENT") {
    factors.push({ key: "timeline", label: "Urgent timeline", points: 15 });
  }
  if (input.revisionTolerance === "HIGH" || input.revisionTolerance === "UNLIMITED") {
    factors.push({ key: "revision", label: "High revision probability", points: 15 });
  }
  if (
    input.decisionMakers === "FAMILY" ||
    input.decisionMakers === "PARTNERS" ||
    input.decisionMakers === "CORPORATE_COMMITTEE"
  ) {
    factors.push({ key: "decision", label: "Multiple decision makers", points: 10 });
  }
  if (input.designFlexibility === "STRICT_REQUIREMENT") {
    factors.push({ key: "design", label: "Strict design language", points: 10 });
  }
  if (input.jurisdiction && COMPLEX_JURISDICTIONS.has(input.jurisdiction.toUpperCase())) {
    factors.push({ key: "regulatory", label: "Regulatory complexity", points: 15 });
  }

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const score = Math.min(100, raw);
  return { score, band: riskBandFor(score), factors };
}

// --- Negotiation conversion probability (Slice H) ---------------------------

/**
 * Deterministic conversion probability (0-100), advisory only. Ported
 * verbatim from packages/contracts/src/negotiation.ts.
 *
 *   probability = clamp(0..100, 80 - rounds * 10 - totalDiscountPct * 2)
 */
export function conversionProbability(input: { rounds: number; totalDiscountPct: number }): number {
  const raw = 80 - input.rounds * 10 - input.totalDiscountPct * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// --- Draft-project state machine (Slice G) — canTransition() ---------------

/**
 * Allowed manual status transitions. PROPOSAL -> ACTIVE is intentionally NOT
 * here — activation runs through the dedicated activation gate, never a
 * plain status edit. Ported verbatim from packages/contracts/src/project-os.ts.
 */
export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  ENQUIRY: ["PROPOSAL", "CANCELLED"],
  PROPOSAL: ["ENQUIRY", "ON_HOLD", "CANCELLED"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["ENQUIRY"],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return true;
  return PROJECT_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Lead terminal statuses --------------------------------------------------

export type LeadStatus = "NEW" | "CONTACTED" | "ASSESSMENT_STARTED" | "AWAITING_REVIEW" | "QUALIFIED" | "DROPPED" | "LOST";

export const LEAD_TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set<LeadStatus>([
  "QUALIFIED", "DROPPED", "LOST",
]);
