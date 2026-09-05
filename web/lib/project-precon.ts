/**
 * Project Precon (Studio pre-construction R&O) — pure logic ported verbatim
 * from packages/contracts/src/project-precon.ts.
 */

export function opportunityScore(probability: number, impact: number): number {
  return Math.max(1, Math.min(5, probability)) * Math.max(1, Math.min(5, impact));
}

export function opportunityPriority(probability: number, impact: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const s = opportunityScore(probability, impact);
  if (s >= 20) return "CRITICAL";
  if (s >= 12) return "HIGH";
  if (s >= 6) return "MEDIUM";
  return "LOW";
}

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

export type ConsPhaseGateDecision = "PENDING" | "GO" | "HOLD" | "NO_GO";

/** GO requires every shared checklist item true. HOLD/NO_GO/PENDING always allowed. */
export function canDecidePhaseGate(args: {
  decision: ConsPhaseGateDecision;
  checklist: Record<string, boolean>;
}): { ok: true } | { ok: false; reason: string; missing: string[] } {
  if (args.decision !== "GO") return { ok: true };
  const missing = CONSULTANCY_PHASE_GATE_CHECKLIST.filter((c) => !args.checklist[c.key]).map((c) => c.label);
  if (missing.length === 0) return { ok: true };
  return { ok: false, reason: `GO blocked — complete: ${missing.join("; ")}.`, missing };
}
