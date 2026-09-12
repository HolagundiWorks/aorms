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
