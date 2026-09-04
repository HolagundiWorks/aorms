"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createSnag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const trade = String(formData.get("trade") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!description) return { error: "Description is required." };

  const supabase = await createClient();
  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "snag",
    p_default_prefix: "SNG",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("snags")
    .insert({ project_id: projectId, ref: refData, location, trade, description, due_date: dueDate })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "snag",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData, description },
  });

  revalidatePath("/snags");
  return null;
}

const STATUSES = ["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"];

export async function updateSnagStatus(snagId: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "CLOSED") patch.closed_at = new Date().toISOString();

  const { error } = await supabase.from("snags").update(patch).eq("id", snagId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "snag",
    p_entity_id: snagId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/snags");
  return {};
}
