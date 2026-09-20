/**
 * ESTI Pulse — read queries for the /pulse page (2026-09-12). Kept
 * separate from lib/pulse/recompute.ts (the write pass) the same way
 * lib/dashboard/queries.ts is separate from lib/dashboard/priority.ts —
 * this file only reads what recompute.ts already wrote.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { bandForScore, type PriorityBand } from "./scoring";

export type TopPriorityTask = {
  id: string;
  title: string;
  band: PriorityBand;
  priorityScore: number;
  confidenceScore: number;
  projectTitle: string | null;
};

/**
 * Real total for the "Critical" KPI tile (2026-09-19 fix, same bug class
 * as getOpenMissingParamsCount()/getBlockedTasksCount()/
 * getLowConfidenceTasksCount() below — every one of these was found by
 * cross-checking this exact page against the native Android app's own
 * Dashboard for the same firm). `bandForScore()`'s CRITICAL cutoff is
 * priority_score >= 70 — mirrored here as a real count rather than
 * filtering getTopPriorityTasks()'s own capped-at-8 display list.
 */
/**
 * `firmId` (2026-09-20) — optional, only needed by the service-role
 * snapshot-kpis cron (app/api/pulse/snapshot-kpis/route.ts), which
 * bypasses RLS entirely; every session-bound caller (this page itself)
 * relies on RLS to scope rows and leaves this unset, unchanged.
 */
export async function getCriticalTasksCount(supabase: SupabaseClient, firmId?: string): Promise<number> {
  let query = supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").gte("priority_score", 70);
  if (firmId) query = query.eq("firm_id", firmId);
  const { count } = await query;
  return count ?? 0;
}

export async function getTopPriorityTasks(supabase: SupabaseClient, limit = 8): Promise<TopPriorityTask[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, priority_score, confidence_score, project_offices(title)")
    .neq("status", "DONE")
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((t) => {
    const project = Array.isArray(t.project_offices) ? t.project_offices[0] : (t.project_offices as { title: string } | null);
    const priorityScore = (t.priority_score as number) ?? 0;
    return {
      id: t.id as string,
      title: t.title as string,
      band: bandForScore(priorityScore),
      priorityScore,
      confidenceScore: (t.confidence_score as number) ?? 100,
      projectTitle: project?.title ?? null,
    };
  });
}

export type LowConfidenceTask = { id: string; title: string; confidenceScore: number; projectTitle: string | null };

export async function getLowConfidenceTasks(supabase: SupabaseClient, threshold = 60, limit = 8): Promise<LowConfidenceTask[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, confidence_score, project_offices(title)")
    .neq("status", "DONE")
    .lt("confidence_score", threshold)
    .order("confidence_score", { ascending: true })
    .limit(limit);

  return (data ?? []).map((t) => {
    const project = Array.isArray(t.project_offices) ? t.project_offices[0] : (t.project_offices as { title: string } | null);
    return { id: t.id as string, title: t.title as string, confidenceScore: (t.confidence_score as number) ?? 100, projectTitle: project?.title ?? null };
  });
}

/** Real total for the "Low confidence" KPI tile — see getOpenMissingParamsCount()'s own comment for why this exists separately from the capped display list above. */
export async function getLowConfidenceTasksCount(supabase: SupabaseClient, threshold = 60, firmId?: string): Promise<number> {
  let query = supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("confidence_score", threshold);
  if (firmId) query = query.eq("firm_id", firmId);
  const { count } = await query;
  return count ?? 0;
}

export type BlockedTaskRow = { dependencyId: string; taskId: string; taskTitle: string; dependsOnTitle: string };

export async function getBlockedTasks(supabase: SupabaseClient, limit = 8): Promise<BlockedTaskRow[]> {
  const { data } = await supabase
    .from("task_dependencies")
    .select(
      "id, task_id, dependency_type, status, tasks!task_dependencies_task_id_fkey(title), depends_on:tasks!task_dependencies_depends_on_task_id_fkey(title)",
    )
    .eq("dependency_type", "BLOCKS")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((d) => {
    const task = Array.isArray(d.tasks) ? d.tasks[0] : (d.tasks as { title: string } | null);
    const dependsOn = Array.isArray(d.depends_on) ? d.depends_on[0] : (d.depends_on as { title: string } | null);
    return {
      dependencyId: d.id as string,
      taskId: d.task_id as string,
      taskTitle: task?.title ?? "Untitled task",
      dependsOnTitle: dependsOn?.title ?? "Untitled task",
    };
  });
}

/** Real total for the "Blocked tasks" KPI tile — see getOpenMissingParamsCount()'s own comment for why this exists separately from the capped display list above. */
export async function getBlockedTasksCount(supabase: SupabaseClient, firmId?: string): Promise<number> {
  let query = supabase.from("task_dependencies").select("id", { count: "exact", head: true }).eq("dependency_type", "BLOCKS").eq("status", "OPEN");
  if (firmId) query = query.eq("firm_id", firmId);
  const { count } = await query;
  return count ?? 0;
}

/**
 * Distinct project count with a real risk signal (2026-09-15) — closes a
 * cross-verification gap: the landing page's Pulse showcase shows a
 * "Projects at risk" tile, but no real query backed that label anywhere
 * in the product. "At risk" here is three concrete, already-tracked
 * signals — not a new scoring model: a project has at least one open
 * task in the CRITICAL priority band (same `bandForScore` this page's
 * own Top Priorities widget uses), at least one open task past its due
 * date, or at least one open task blocked on another (same BLOCKS
 * dependency `getBlockedTasks` already reads). One open task can trip
 * more than one signal — this only cares whether the project has any.
 */
export async function getProjectsAtRiskCount(supabase: SupabaseClient, today: string): Promise<number> {
  const [{ data: openTasks }, { data: blockedDeps }] = await Promise.all([
    supabase.from("tasks").select("project_id, priority_score, due_date").neq("status", "DONE").not("project_id", "is", null),
    supabase
      .from("task_dependencies")
      .select("tasks!task_dependencies_task_id_fkey(project_id)")
      .eq("dependency_type", "BLOCKS")
      .eq("status", "OPEN"),
  ]);

  const atRisk = new Set<string>();
  for (const t of openTasks ?? []) {
    const projectId = t.project_id as string | null;
    if (!projectId) continue;
    const overdue = !!t.due_date && (t.due_date as string) < today;
    if (overdue || bandForScore((t.priority_score as number) ?? 0) === "CRITICAL") atRisk.add(projectId);
  }
  for (const d of blockedDeps ?? []) {
    const task = Array.isArray(d.tasks) ? d.tasks[0] : (d.tasks as { project_id: string | null } | null);
    if (task?.project_id) atRisk.add(task.project_id);
  }
  return atRisk.size;
}

export type MissingParamRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  assigneeName: string | null;
  parameterType: string;
  description: string;
};

export async function getOpenMissingParams(supabase: SupabaseClient, limit = 12): Promise<MissingParamRow[]> {
  const { data } = await supabase
    .from("task_missing_params")
    .select("id, task_id, parameter_type, description, tasks(title, profiles!tasks_assignee_id_fkey(full_name))")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((p) => {
    const task = Array.isArray(p.tasks) ? p.tasks[0] : (p.tasks as { title: string; profiles: unknown } | null);
    const assignee = task ? (Array.isArray(task.profiles) ? task.profiles[0] : (task.profiles as { full_name: string | null } | null)) : null;
    return {
      id: p.id as string,
      taskId: p.task_id as string,
      taskTitle: task?.title ?? "Untitled task",
      assigneeName: assignee?.full_name ?? null,
      parameterType: p.parameter_type as string,
      description: p.description as string,
    };
  });
}

/**
 * Real total, not the capped list length (2026-09-19 fix — found live via
 * the native Android app's own Dashboard showing a genuinely different
 * "Open gaps" number for the same firm: 117 vs. this page's 12). The "Open
 * gaps" KPI tile below was using `missingParams.length` — the *display*
 * list from getOpenMissingParams(), which has always defaulted to
 * `limit = 12` — so any firm with more than 12 open gaps has always shown
 * a silently wrong, capped-at-12 number on this tile. This is the fix:
 * a real `count: "exact", head: true` query, independent of the display
 * list's own limit.
 */
export async function getOpenMissingParamsCount(supabase: SupabaseClient, firmId?: string): Promise<number> {
  let query = supabase.from("task_missing_params").select("id", { count: "exact", head: true }).eq("status", "OPEN");
  if (firmId) query = query.eq("firm_id", firmId);
  const { count } = await query;
  return count ?? 0;
}
