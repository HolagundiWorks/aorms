"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type TaskActionState = { error: string } | null;

export async function createTaskRecord(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
  const classification = String(formData.get("classification") ?? "").trim() || null;
  const workType = String(formData.get("workType") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      project_id: projectId,
      assignee_id: assigneeId,
      classification,
      work_type: workType,
      priority,
      due_date: dueDate,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "task",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { title, projectId, assigneeId, classification, workType, priority, dueDate },
  });

  revalidatePath("/tasks");
  return null;
}

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

/**
 * Status-only update — genuinely didn't exist anywhere in this app before
 * (confirmed via a full search: `createTaskRecord` above was the only
 * write path `tasks` had at all). Added for the dashboard's Action Queue
 * "Mark done" button (2026-09-13 restructure), but deliberately generic
 * over the full status enum, not a one-off "mark done" mutation, so any
 * future status control (a Kanban drag, a status Select on `/tasks`) can
 * reuse it instead of writing a second one.
 */
export async function updateTaskStatus(taskId: string, status: string): Promise<{ error?: string }> {
  if (!TASK_STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "task",
    p_entity_id: taskId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/pulse");
  return {};
}
