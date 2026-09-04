"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createTender(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("tenders")
    .insert({
      project_id: projectId,
      title,
      category,
      due_date: dueDate,
      instructions,
      status: "OPEN",
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "tender",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title },
  });

  revalidatePath("/tenders");
  return null;
}

export async function inviteTenderContractor(
  tenderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contractorId = String(formData.get("contractorId") ?? "").trim();
  if (!contractorId) return { error: "Select a contractor." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("tender_invitations")
    .insert({ tender_id: tenderId, contractor_id: contractorId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "tender_invitation",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { tenderId, contractorId },
  });

  revalidatePath(`/tenders/${tenderId}`);
  return null;
}

/** Closing a tender unseals tender_bids_sealed (amount_paise/notes become visible). */
export async function closeTender(tenderId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenders")
    .update({ status: "CLOSED", updated_at: new Date().toISOString() })
    .eq("id", tenderId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "tender",
    p_entity_id: tenderId,
    p_action: "CLOSE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/tenders/${tenderId}`);
  return {};
}

export async function awardTender(tenderId: string, contractorId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenders")
    .update({ status: "AWARDED", awarded_contractor_id: contractorId, updated_at: new Date().toISOString() })
    .eq("id", tenderId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "tender",
    p_entity_id: tenderId,
    p_action: "AWARD",
    p_before: null,
    p_after: { contractorId },
  });

  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/tenders");
  return {};
}
