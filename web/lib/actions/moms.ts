"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type MomActionState = { error: string } | null;

export async function createMomRecord(
  _prev: MomActionState,
  formData: FormData,
): Promise<MomActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const attendees = String(formData.get("attendees") ?? "").trim() || null;
  const minutes = String(formData.get("minutes") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "mom",
    p_default_prefix: "MOM",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("moms")
    .insert({
      ref: refData,
      project_id: projectId,
      title,
      meeting_date: meetingDate,
      venue,
      attendees,
      minutes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "mom",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title, meetingDate },
  });

  revalidatePath("/moms");
  return null;
}

export type MomActionItemState = { error: string } | null;

/**
 * MoM action items — Phase 4's own flagged gap ("mom_actions ... sub-
 * resources" not built). `task_id` (a linked `tasks` row) exists on the
 * table but is left null here — wiring a MoM action into a real assigned
 * task is a further step this pass doesn't attempt, matching the same
 * "don't guess ahead of what's asked" discipline as everywhere else.
 */
export async function addMomActionRecord(
  _prev: MomActionItemState,
  formData: FormData,
): Promise<MomActionItemState> {
  const momId = String(formData.get("momId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assigneeName = String(formData.get("assigneeName") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;

  if (!momId) return { error: "Missing meeting minutes." };
  if (!description) return { error: "Description is required." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("mom_actions")
    .select("id", { count: "exact", head: true })
    .eq("mom_id", momId);

  const { data: inserted, error } = await supabase
    .from("mom_actions")
    .insert({
      mom_id: momId,
      description,
      assignee_name: assigneeName,
      due_date: dueDate,
      status: "OPEN",
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "mom_action",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { momId, description, assigneeName, dueDate },
  });

  revalidatePath(`/moms/${momId}`);
  return null;
}

const MOM_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"];

export async function updateMomActionStatus(
  actionId: string,
  momId: string,
  status: string,
): Promise<{ error?: string }> {
  if (!MOM_ACTION_STATUSES.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase.from("mom_actions").update({ status }).eq("id", actionId);
  if (error) return { error: error.message };

  revalidatePath(`/moms/${momId}`);
  return {};
}

export async function removeMomAction(actionId: string, momId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("mom_actions").delete().eq("id", actionId);
  if (error) return { error: error.message };

  revalidatePath(`/moms/${momId}`);
  return {};
}
