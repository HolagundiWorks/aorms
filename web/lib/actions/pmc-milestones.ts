"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

type ActionState = { error: string } | null;

export async function createMilestone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const plannedDate = String(formData.get("plannedDate") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "pmc_milestone",
    p_default_prefix: "MS",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const { data: inserted, error } = await supabase
    .from("pmc_milestones")
    .insert({ project_id: projectId, ref: refData, title, planned_date: plannedDate, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_milestone",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData, title },
  });

  revalidatePath("/pmc-milestones");
  return null;
}

const STATUSES = ["PLANNED", "ON_TRACK", "AT_RISK", "DELAYED", "COMPLETE"];

export async function updateMilestoneStatus(milestoneId: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "COMPLETE") patch.actual_date = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("pmc_milestones").update(patch).eq("id", milestoneId);
  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_milestone",
    p_entity_id: milestoneId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/pmc-milestones");
  return {};
}

/** Set a milestone's duration and predecessor link (AQC-style PDM: FS/SS/FF/SF + lag) for the critical-path view. */
export async function updateMilestoneSchedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const durationRaw = String(formData.get("durationDays") ?? "").trim();
  const predecessorId = String(formData.get("predecessorId") ?? "").trim() || null;
  const depType = String(formData.get("depType") ?? "FS").trim();
  const lag = Math.round(Number(String(formData.get("lagDays") ?? "0").trim() || "0"));
  const duration = durationRaw === "" ? null : Math.round(Number(durationRaw));
  if (!id) return { error: "Missing milestone." };
  if (duration !== null && (!Number.isFinite(duration) || duration < 0 || duration > 5000)) return { error: "Duration must be 0–5000 days." };
  if (!["FS", "SS", "FF", "SF"].includes(depType)) return { error: "Invalid link type." };
  if (!Number.isFinite(lag) || Math.abs(lag) > 5000) return { error: "Invalid lag." };
  if (predecessorId === id) return { error: "A milestone can't follow itself." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pmc_milestones")
    .update({ duration_days: duration, predecessor_id: predecessorId, dep_type: depType, lag_days: lag, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath("/pmc-milestones");
  return null;
}
