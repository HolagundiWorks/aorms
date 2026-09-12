/**
 * ESTI Pulse — Modules 5 & 6, deterministic task priority + confidence
 * scoring (2026-09-12). Pure TypeScript, no LLM involved anywhere in
 * this file — matches docs/esti/ESTI-PULSE.md § 16's own stated tech
 * stack ("Scoring | Deterministic TypeScript... same pattern as
 * computeTaskPriority") and § "Core principle": deterministic systems
 * create business truth, LLMs only explain it. Every score this module
 * produces must be explainable from its own inputs — no hidden state,
 * no randomness, no external calls.
 *
 * Bands (never show the raw 0-100 number in UI, per § 8's own display
 * rule): CRITICAL / ACTION_TODAY / WATCH / NORMAL / BACKLOG.
 */

export type TaskScoringInput = {
  id: string;
  priority: string; // LOW | MEDIUM | HIGH | CRITICAL (the task's own manual enum)
  status: string;
  dueDate: string | null; // ISO date
  updatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  assigneeId: string | null;
  classification: string | null; // BILLABLE | NON_BILLABLE | ...
  openBlockingDepCount: number; // open task_dependencies where dependency_type = BLOCKS
  openMissingParamCount: number; // open task_missing_params
  hasClientReviewDecision: boolean; // a linked decisions row currently in CLIENT_REVIEW
  maxLinkedDecisionImpact: "LOW" | "MEDIUM" | "HIGH" | null;
  projectOutstandingPaise: number; // project's own outstanding receivables (invoices grand_total - paid)
};

export type PriorityBand = "CRITICAL" | "ACTION_TODAY" | "WATCH" | "NORMAL" | "BACKLOG";

const PRIORITY_ENUM_WEIGHT: Record<string, number> = { CRITICAL: 25, HIGH: 15, MEDIUM: 5, LOW: 0 };
const IMPACT_WEIGHT: Record<string, number> = { HIGH: 15, MEDIUM: 8, LOW: 3 };

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Confidence Score (Module 6) — a task with missing data must not look
 * healthy. Starts at 100, each real gap deducts a fixed amount.
 */
export function computeConfidenceScore(task: TaskScoringInput, today: string): number {
  let score = 100;

  // Dependency completeness
  score -= Math.min(task.openBlockingDepCount * 15, 45);

  // Update freshness — no update in >7 days on an open task is a real
  // signal something's stalled, not just quiet.
  const daysSinceUpdate = daysBetween(task.updatedAt, today);
  if (daysSinceUpdate > 14) score -= 25;
  else if (daysSinceUpdate > 7) score -= 12;

  // Approval clarity — a decision still in client review means the task
  // may be building on an unconfirmed premise.
  if (task.hasClientReviewDecision) score -= 15;

  // Assignee confirmation
  if (!task.assigneeId) score -= 20;

  // Site readiness / open gaps (missing parameters)
  score -= Math.min(task.openMissingParamCount * 10, 30);

  return clamp(score);
}

/**
 * Priority Score (Module 5) — "which task, if ignored now, creates the
 * highest project damage?" Additive risk factors, each grounded in real
 * data already on the task/project, not invented. Confidence penalty is
 * inverted on purpose (ESTI-PULSE.md's own framing): an unclear task is
 * riskier, not safer, so low confidence pulls priority UP.
 */
export function computeTaskPriority(task: TaskScoringInput, confidenceScore: number, today: string): number {
  let score = PRIORITY_ENUM_WEIGHT[task.priority] ?? 0;

  // Deadline risk
  if (task.dueDate) {
    const daysUntilDue = daysBetween(today, task.dueDate);
    if (daysUntilDue < 0) score += 30; // overdue
    else if (daysUntilDue === 0) score += 25;
    else if (daysUntilDue <= 2) score += 15;
    else if (daysUntilDue <= 7) score += 5;
  }

  // Dependency blockage — a task blocking others (or blocked itself)
  // creates cascading damage.
  score += Math.min(task.openBlockingDepCount * 10, 30);

  // Site/client impact — from any linked decision's own impact rating.
  if (task.maxLinkedDecisionImpact) score += IMPACT_WEIGHT[task.maxLinkedDecisionImpact] ?? 0;

  // Financial impact — a task on a project with real outstanding
  // receivables carries more consequence than one on a fully-settled
  // project. Banded, not linear, so one huge invoice doesn't dominate.
  // ₹1 = 100 paise, so ₹10,00,000 (10L) = 100,000,000 paise and
  // ₹50,00,000 (50L) = 500,000,000 paise — an earlier version of these
  // constants used an Indian-style underscore grouping (`10_00_00_00` /
  // `50_00_00_00`) that doesn't actually equal the rupee amount it looks
  // like at a glance; JS underscores are purely cosmetic digit
  // separators, not lakh/crore place markers, and the miscount made both
  // bands trigger 10x too early. Caught live-verifying this module
  // against a real seeded project's invoice total. Plain digit groups of
  // three below, to avoid repeating that mistake.
  if (task.projectOutstandingPaise > 500_000_000) score += 15; // > ₹50L
  else if (task.projectOutstandingPaise > 100_000_000) score += 8; // > ₹10L

  // Aging risk — an open task that's simply been sitting a long time.
  // Floored at 0: `today` is a date-only string (midnight UTC) while
  // `createdAt` is a full timestamp, so a task created earlier the same
  // UTC day makes daysBetween() go slightly negative — a pure time-of-day
  // artifact, not a task actually created "in the future". Without this
  // floor that briefly manifests as a small negative aging contribution
  // (found live-verifying this module against a just-inserted test task).
  const ageDays = Math.max(0, daysBetween(task.createdAt, today));
  score += Math.min(Math.floor(ageDays / 7) * 2, 15);

  // Confidence penalty (inverted) — the less confident we are this task
  // is actually on track, the more it needs attention, not less.
  score += Math.round((100 - confidenceScore) * 0.2);

  return clamp(score);
}

export function bandForScore(priorityScore: number): PriorityBand {
  if (priorityScore >= 70) return "CRITICAL";
  if (priorityScore >= 50) return "ACTION_TODAY";
  if (priorityScore >= 30) return "WATCH";
  if (priorityScore >= 15) return "NORMAL";
  return "BACKLOG";
}

export const PRIORITY_BAND_LABEL: Record<PriorityBand, string> = {
  CRITICAL: "Critical",
  ACTION_TODAY: "Action today",
  WATCH: "Watch",
  NORMAL: "Normal",
  BACKLOG: "Backlog",
};
