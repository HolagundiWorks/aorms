"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

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
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("pmc_milestones")
    .insert({ project_id: projectId, ref: refData, title, planned_date: plannedDate, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

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
  if (error) return { error: error.message };

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
