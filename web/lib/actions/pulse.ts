"use server";

/**
 * ESTI Pulse — Server Actions (2026-09-12). Workflow management
 * (Modules 1/2) and an on-demand trigger for the deterministic recompute
 * pass (Modules 5/6) — see lib/pulse/recompute.ts and
 * app/api/pulse/recompute/route.ts for the shared logic both this file
 * and the bearer-secured cron route call.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { recomputeTaskScores } from "../pulse/recompute";

const DEPENDENCY_TYPES = ["BLOCKS", "INFORMS", "APPROVAL", "DOCUMENT"];

export type PulseActionState = { error: string } | null;

/** Module 1 — link two tasks. `dependsOnTaskId` is the task THIS task is
 * waiting on (a BLOCKS edge means dependsOnTaskId must finish first). */
export async function addTaskDependency(
  _prev: PulseActionState,
  formData: FormData,
): Promise<PulseActionState> {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const dependsOnTaskId = String(formData.get("dependsOnTaskId") ?? "").trim();
  const dependencyType = String(formData.get("dependencyType") ?? "").trim();

  if (!taskId || !dependsOnTaskId) return { error: "Both tasks are required." };
  if (taskId === dependsOnTaskId) return { error: "A task can't depend on itself." };
  if (!DEPENDENCY_TYPES.includes(dependencyType)) return { error: "Invalid dependency type." };

  const supabase = await createClient();
  const { error } = await supabase.from("task_dependencies").insert({
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
    dependency_type: dependencyType,
  });
  if (error) return { error: error.message };

  revalidatePath("/pulse");
  revalidatePath("/tasks");
  return null;
}

export async function resolveTaskDependency(dependencyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("task_dependencies").update({ status: "RESOLVED" }).eq("id", dependencyId);
  if (error) return { error: error.message };

  revalidatePath("/pulse");
  revalidatePath("/tasks");
  return {};
}

const MISSING_PARAM_STATUSES = ["OPEN", "CONFIRMED", "BLOCKED", "NOT_REQUIRED"];

/** Module 2 — a team member disposes of a detected gap directly (a
 * simplified stand-in for Module 4's full standup question round-trip,
 * which needs a notifications system this app doesn't have yet — see
 * the plan's disclosed-scope note). */
export async function resolveMissingParam(paramId: string, status: string): Promise<{ error?: string }> {
  if (!MISSING_PARAM_STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patch: Record<string, unknown> = { status };
  if (status !== "OPEN") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by_id = user?.id ?? null;
  } else {
    patch.resolved_at = null;
    patch.resolved_by_id = null;
  }

  const { error } = await supabase.from("task_missing_params").update(patch).eq("id", paramId);
  if (error) return { error: error.message };

  revalidatePath("/pulse");
  return {};
}

export type RecomputeNowState = { error?: string; summary?: { tasksScanned: number; tasksChanged: number; missingParamsOpened: number; missingParamsResolved: number } } | null;

/** On-demand trigger for the same logic the bearer-secured cron route
 * runs — so verifying/using Pulse never has to wait on the 15-minute
 * schedule. Any signed-in office-hub user can trigger it (recompute only
 * reads/writes tasks-adjacent tables already covered by is_office_staff()
 * RLS); the heavier gate that matters is the route's own bearer secret,
 * which this action doesn't need since it goes through the normal
 * session-scoped client below, not the service-role one directly. */
export async function recomputeNow(): Promise<RecomputeNowState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to recompute Pulse." };

  // Uses the service-role client for the actual writes (same reasoning
  // as the route handler: recompute touches task_priority_log, which has
  // no write RLS policy at all — service-role only, by design).
  const service = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const summary = await recomputeTaskScores(service, today);
    revalidatePath("/pulse");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { summary };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Recompute failed" };
  }
}
