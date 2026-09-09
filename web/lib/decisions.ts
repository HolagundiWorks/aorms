/**
 * CRIF decision-register vocabulary — port of packages/contracts/src/
 * schemas.ts's `DecisionState`/`DECISION_TRANSITIONS`/`RevisionCategory`
 * (kept here rather than in a shared contracts package since web/ doesn't
 * depend on packages/contracts — see NEXTJS-SUPABASE-MIGRATION.md).
 */

export const DECISION_STATES = ["DRAFT", "OPEN", "CLIENT_REVIEW", "ACCEPTED", "REJECTED", "LOCKED"] as const;
export type DecisionState = (typeof DECISION_STATES)[number];

export const DECISION_STATE_LABEL: Record<DecisionState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLIENT_REVIEW: "Client review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  LOCKED: "Locked",
};

export const DECISION_STATE_TAG: Record<DecisionState, "gray" | "blue" | "teal" | "green" | "red" | "purple"> = {
  DRAFT: "gray",
  OPEN: "blue",
  CLIENT_REVIEW: "teal",
  ACCEPTED: "green",
  REJECTED: "red",
  LOCKED: "purple",
};

/** Valid next states from each CRIF state — the same map the RLS-backed
 * `updateDecisionState` server action validates against before writing
 * (staff have blanket RLS write access to this table, so this app-layer
 * check is the only thing stopping a nonsensical jump like DRAFT -> LOCKED). */
export const DECISION_TRANSITIONS: Record<DecisionState, DecisionState[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLIENT_REVIEW", "ACCEPTED", "REJECTED"],
  CLIENT_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["LOCKED"],
  REJECTED: ["LOCKED"],
  LOCKED: ["OPEN"],
};

export const REVISION_CATEGORIES = ["MINOR", "MAJOR", "CRITICAL"] as const;
export type RevisionCategory = (typeof REVISION_CATEGORIES)[number];

export const REVISION_SOURCES = ["CLIENT_DRIVEN", "INTERNAL_ERROR", "TECHNICAL_QUERY", "SCOPE_CHANGE"] as const;
export type RevisionSource = (typeof REVISION_SOURCES)[number];

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

/**
 * Steps for a `ProgressIndicator` visualizing a decision's place in the
 * CRIF state machine. The real machine branches (OPEN can go straight to
 * ACCEPTED/REJECTED without CLIENT_REVIEW; LOCKED can reopen to OPEN) —
 * a linear progress bar can't represent that faithfully, so this shows
 * one canonical happy path (Draft → Open → Client review → Accepted →
 * Locked) and renders REJECTED as an `invalid` marker at the "Client
 * review" position regardless of which state it was actually rejected
 * from, rather than trying to model every real transition. A
 * simplification, not the source of truth — DECISION_TRANSITIONS above
 * still governs what the Dropdown actually allows.
 */
export type DecisionProgressStep = { label: string; complete: boolean; current: boolean; invalid: boolean };

const PROGRESS_LABELS = ["Draft", "Open", "Client review", "Accepted", "Locked"];
const PROGRESS_ORDER: DecisionState[] = ["DRAFT", "OPEN", "CLIENT_REVIEW", "ACCEPTED", "LOCKED"];
const REJECTED_AT = 2;

export function decisionProgressSteps(state: DecisionState): DecisionProgressStep[] {
  const currentIndex = state === "REJECTED" ? REJECTED_AT : PROGRESS_ORDER.indexOf(state);

  return PROGRESS_LABELS.map((label, i) => {
    if (state === "REJECTED" && i === REJECTED_AT) {
      return { label, complete: false, current: false, invalid: true };
    }
    return { label, complete: i < currentIndex, current: i === currentIndex, invalid: false };
  });
}
