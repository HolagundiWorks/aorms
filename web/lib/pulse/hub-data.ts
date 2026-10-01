import { cache } from "react";
import { createClient } from "../supabase/server";

/**
 * The office's "today" numbers, fetched once per request and shared by the
 * Pulse header brief (PulseBrief.tsx) and the hub sheet (HubSheet.tsx) — React's
 * `cache()` dedupes the call, so two components cost one set of queries. All
 * reads go through the caller's RLS-scoped session; nothing is estimated.
 */
export type HubTask = { id: string; title: string; status: string; priority: string; due_date: string | null; project_id: string | null };

export const getHubData = cache(async () => {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in IST

  const [{ data: projects }, { data: openTasks }, { data: meetings }, { data: clientReview }, { count: approvalsSent }, { count: openSnags }] =
    await Promise.all([
      supabase.from("project_offices").select("id, ref, status").is("archived_at", null),
      supabase.from("tasks").select("id, title, status, priority, due_date, project_id").neq("status", "DONE").limit(1000),
      supabase.from("moms").select("id, title, project_id").eq("meeting_date", today),
      supabase.from("decisions").select("id, title, project_id").eq("state", "CLIENT_REVIEW").limit(20),
      supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "SENT"),
      supabase.from("snags").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
    ]);

  const projectRows = projects ?? [];
  const tasks = (openTasks ?? []) as HubTask[];
  return {
    today,
    dateLabel: now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "long", year: "numeric" }).toUpperCase(),
    weekday: now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }),
    projectRows,
    refOf: new Map(projectRows.map((p) => [p.id, p.ref])),
    byStatus: projectRows.reduce((m, p) => m.set(p.status, (m.get(p.status) ?? 0) + 1), new Map<string, number>()),
    tasks,
    dueToday: tasks.filter((t) => t.due_date === today).length,
    overdue: tasks.filter((t) => t.due_date && t.due_date < today),
    blocked: tasks.filter((t) => t.status === "BLOCKED"),
    meetings: meetings ?? [],
    decisions: clientReview ?? [],
    approvalsSent: approvalsSent ?? 0,
    openSnags: openSnags ?? 0,
  };
});

export type HubData = Awaited<ReturnType<typeof getHubData>>;

/** One-sentence brief from the numbers: only what is non-zero, most urgent first. Pure, so it can be tested. */
export function briefSentence(d: Pick<HubData, "weekday" | "meetings" | "dueToday" | "overdue" | "decisions" | "approvalsSent" | "blocked" | "openSnags">): string {
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const parts: string[] = [];
  if (d.overdue.length) parts.push(`${plural(d.overdue.length, "task")} overdue`);
  if (d.dueToday) parts.push(`${plural(d.dueToday, "task")} due today`);
  if (d.meetings.length) parts.push(plural(d.meetings.length, "meeting"));
  if (d.decisions.length) parts.push(`${plural(d.decisions.length, "decision")} waiting on the client`);
  if (d.approvalsSent) parts.push(`${plural(d.approvalsSent, "approval")} awaiting a response`);
  if (d.blocked.length) parts.push(`${plural(d.blocked.length, "task")} blocked`);
  if (d.openSnags) parts.push(`${plural(d.openSnags, "open snag")}`);
  if (parts.length === 0) return `${d.weekday} — nothing is due or waiting. The office is clear.`;
  const head = parts.slice(0, -1).join(", ");
  return `${d.weekday} — ${parts.length === 1 ? parts[0] : `${head} and ${parts[parts.length - 1]}`}.`;
}
