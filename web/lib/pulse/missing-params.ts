/**
 * ESTI Pulse — Module 2, Missing Parameter Detector (2026-09-12).
 * Deterministic per-task rules, an honest subset matched to what this
 * schema can actually detect — not docs/esti/ESTI-PULSE.md § 5's full
 * firm-wide list (client approval / site measurement / consultant input
 * / etc. would need data this app doesn't structurally capture per-task
 * yet). Returns the gaps a caller should reconcile against
 * `task_missing_params` (open ones not still detected get resolved,
 * newly-detected ones get inserted) — see lib/actions/pulse.ts's
 * `recomputeTaskScores` for the reconciliation itself.
 */

export type MissingParamCandidate = {
  parameterType: "NO_DUE_DATE" | "NO_ASSIGNEE" | "UNRESOLVED_DEPENDENCY" | "STALE_NO_UPDATE";
  description: string;
};

export type MissingParamDetectionInput = {
  status: string;
  dueDate: string | null;
  assigneeId: string | null;
  updatedAt: string;
  openBlockingDepCount: number;
};

const STALE_DAYS_THRESHOLD = 10;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

/** Only meaningful for open (non-DONE) tasks — a finished task with no
 * due date isn't a gap, it's just history. */
export function detectMissingParams(task: MissingParamDetectionInput, today: string): MissingParamCandidate[] {
  if (task.status === "DONE") return [];

  const gaps: MissingParamCandidate[] = [];

  if (!task.dueDate) {
    gaps.push({ parameterType: "NO_DUE_DATE", description: "No due date set — can't be scheduled or scored for urgency." });
  }

  if (!task.assigneeId) {
    gaps.push({ parameterType: "NO_ASSIGNEE", description: "No one is assigned — this task has no owner." });
  }

  if (task.openBlockingDepCount > 0) {
    gaps.push({
      parameterType: "UNRESOLVED_DEPENDENCY",
      description: `Blocked by ${task.openBlockingDepCount} unresolved dependenc${task.openBlockingDepCount === 1 ? "y" : "ies"}.`,
    });
  }

  const daysSinceUpdate = daysBetween(task.updatedAt, today);
  if (daysSinceUpdate > STALE_DAYS_THRESHOLD) {
    gaps.push({
      parameterType: "STALE_NO_UPDATE",
      description: `No update in ${daysSinceUpdate} days — likely stalled, not just quiet.`,
    });
  }

  return gaps;
}
