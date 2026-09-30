import { HOURS_PER_DAY, countWorkdays } from "./dates";

/** Hours assumed for an open task with no estimate — a conservative one-day figure, so unestimated work still counts toward load. */
export const DEFAULT_TASK_HOURS = HOURS_PER_DAY;
/** A deadline this many working days away (today included) or fewer is "short". */
export const SHORT_DEADLINE_DAYS = 2;
/** Window used for the utilisation bar: next 10 working days (two weeks). */
const UTILISATION_WINDOW_DAYS = 10;

export type LoadTask = {
  id: string;
  status: string;
  assignee_id: string | null;
  due_date: string | null;
  estimated_hours: number | null;
};

export type TaskAlert = "OVERDUE" | "SHORT_DEADLINE" | "AT_RISK";

export type AssigneeLoad = {
  openHours: number;
  openCount: number;
  /** Hours due in the next two working weeks vs. what one person can deliver in them (0–∞, >1 means over capacity). */
  utilisation: number;
  overloaded: boolean;
  /** Hours by which the tightest deadline overshoots capacity (0 when fine). */
  shortfallHours: number;
  /** The date of the deadline that first breaks capacity, if any. */
  breakDate: string | null;
};

const hoursOf = (t: LoadTask) => t.estimated_hours ?? DEFAULT_TASK_HOURS;
export const isOpen = (t: LoadTask) => t.status !== "DONE";

/**
 * Earliest-deadline-first feasibility: walk one person's open tasks in due
 * order; at each deadline, cumulative hours must fit in the working hours
 * left from today to that date. This catches the case a raw task count
 * misses — three "small" tasks all due Friday that add up to 30 hours.
 * Tasks with no due date add to `openHours` but can't be checked.
 */
export function analyzeAssignee(tasks: LoadTask[], today: string): AssigneeLoad {
  const open = tasks.filter(isOpen);
  const dated = open.filter((t) => t.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const openHours = open.reduce((s, t) => s + hoursOf(t), 0);

  let cumulative = 0;
  let shortfallHours = 0;
  let breakDate: string | null = null;
  for (const t of dated) {
    cumulative += hoursOf(t);
    const available = countWorkdays(today, t.due_date!) * HOURS_PER_DAY;
    const over = cumulative - available;
    if (over > 0 && over > shortfallHours) {
      shortfallHours = over;
      breakDate ??= t.due_date!;
    }
  }

  const windowCap = UTILISATION_WINDOW_DAYS * HOURS_PER_DAY;
  const windowHours = dated
    .filter((t) => countWorkdays(today, t.due_date!) <= UTILISATION_WINDOW_DAYS)
    .reduce((s, t) => s + hoursOf(t), 0);

  return {
    openHours,
    openCount: open.length,
    utilisation: windowHours / windowCap,
    overloaded: shortfallHours > 0,
    shortfallHours,
    breakDate,
  };
}

/** Per-task alert: overdue > short deadline > at risk (assignee can't fit it before its date). */
export function taskAlerts(tasks: LoadTask[], today: string): Map<string, TaskAlert> {
  const out = new Map<string, TaskAlert>();
  const byAssignee = new Map<string, LoadTask[]>();
  for (const t of tasks) {
    if (!isOpen(t) || !t.due_date) continue;
    if (t.due_date < today) out.set(t.id, "OVERDUE");
    else if (countWorkdays(today, t.due_date) <= SHORT_DEADLINE_DAYS) out.set(t.id, "SHORT_DEADLINE");
    if (t.assignee_id) byAssignee.set(t.assignee_id, [...(byAssignee.get(t.assignee_id) ?? []), t]);
  }
  for (const list of byAssignee.values()) {
    let cumulative = 0;
    for (const t of [...list].sort((a, b) => a.due_date!.localeCompare(b.due_date!))) {
      cumulative += hoursOf(t);
      if (!out.has(t.id) && cumulative > countWorkdays(today, t.due_date!) * HOURS_PER_DAY) out.set(t.id, "AT_RISK");
    }
  }
  return out;
}
