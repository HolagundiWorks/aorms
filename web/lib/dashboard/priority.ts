/**
 * Top-3 priority ranking (2026-09-10 dashboard redesign) — the one place
 * "criticality" is computed. Deliberately a small, transparent,
 * deterministic formula (no ML, no black box) pooling four item kinds
 * into a single ranked list, matching the user's own "nothing beyond
 * what's in the data" direction. Documented here so the weights stay
 * readable/adjustable, not tuned by trial and error — see
 * docs/esti/DASHBOARD-AND-ESTI-PHRASER.md for the written-out account.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getApprovalsSummary, getOpenClientRequests, getOpenConsultantRequests, getOpenTasksForPriority } from "./queries";

export type PriorityKind = "TASK" | "APPROVAL" | "CLIENT_REQUEST" | "CONSULTANT_REQUEST";

export type PriorityItem = {
  kind: PriorityKind;
  id: string;
  title: string;
  projectTitle: string | null;
  href: string;
  ageDays: number;
  score: number;
};

// Base weight per item — a task's own priority enum drives its weight;
// the other three kinds each get one fixed base weight, reflecting that
// a CRITICAL task should usually outrank a routine open request.
const TASK_BASE: Record<string, number> = { CRITICAL: 100, HIGH: 70, MEDIUM: 40, LOW: 20 };
const APPROVAL_BASE = 60;
const CLIENT_REQUEST_BASE = 55;
const CONSULTANT_REQUEST_BASE = 35;

const AGE_BONUS_PER_DAY = 3;
const AGE_BONUS_CAP = 60;

function ageDaysSince(dateStr: string, today: string): number {
  const days = Math.floor((new Date(today).getTime() - new Date(dateStr).getTime()) / 86_400_000);
  return Math.max(0, days);
}

function score(base: number, ageDays: number): number {
  return base + Math.min(ageDays * AGE_BONUS_PER_DAY, AGE_BONUS_CAP);
}

export async function getTopPriorities(supabase: SupabaseClient, today: string, n = 3): Promise<PriorityItem[]> {
  const [tasks, approvals, clientRequests, consultantRequests] = await Promise.all([
    getOpenTasksForPriority(supabase),
    getApprovalsSummary(supabase, today),
    getOpenClientRequests(supabase),
    getOpenConsultantRequests(supabase),
  ]);

  const items: PriorityItem[] = [];

  for (const t of tasks) {
    const overdueDays = t.dueDate ? ageDaysSince(t.dueDate, today) : 0;
    items.push({
      kind: "TASK",
      id: t.id,
      title: t.title,
      projectTitle: t.projectTitle,
      href: "/tasks",
      ageDays: overdueDays,
      score: score(TASK_BASE[t.priority] ?? TASK_BASE.MEDIUM, overdueDays),
    });
  }

  for (const a of approvals.pending) {
    const ageDays = a.date ? ageDaysSince(a.date, today) : 0;
    items.push({
      kind: "APPROVAL",
      id: a.id,
      title: a.title,
      projectTitle: a.projectTitle,
      href: "/approvals",
      ageDays,
      score: score(APPROVAL_BASE, ageDays),
    });
  }

  for (const r of clientRequests) {
    const ageDays = ageDaysSince(r.createdAt, today);
    items.push({
      kind: "CLIENT_REQUEST",
      id: r.id,
      title: r.subject,
      projectTitle: r.projectTitle,
      href: `/projects/${r.projectId}`,
      ageDays,
      // A client-flagged CRITICAL/MAJOR revision outranks a routine request.
      score: score(r.revisionCategory === "CRITICAL" ? APPROVAL_BASE + 20 : CLIENT_REQUEST_BASE, ageDays),
    });
  }

  for (const c of consultantRequests) {
    const ageDays = ageDaysSince(c.createdAt, today);
    items.push({
      kind: "CONSULTANT_REQUEST",
      id: c.id,
      title: c.subject,
      projectTitle: c.projectTitle,
      href: "/consultants",
      ageDays,
      score: score(CONSULTANT_REQUEST_BASE, ageDays),
    });
  }

  return items.sort((a, b) => b.score - a.score).slice(0, n);
}
