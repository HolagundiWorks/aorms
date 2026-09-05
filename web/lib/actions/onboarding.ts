"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function saveOnboarding(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const billingAddress = String(formData.get("billingAddress") ?? "").trim() || null;
  const gstin = String(formData.get("gstin") ?? "").trim() || null;
  const pan = String(formData.get("pan") ?? "").trim() || null;
  const communicationPreference = String(formData.get("communicationPreference") ?? "").trim() || null;
  const repName = String(formData.get("repName") ?? "").trim();
  const repDesignation = String(formData.get("repDesignation") ?? "").trim() || null;
  const repPhone = String(formData.get("repPhone") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: existing } = await supabase.from("client_onboardings").select("authorized_reps").eq("project_id", projectId).maybeSingle();
  const authorizedReps = Array.isArray(existing?.authorized_reps) ? existing.authorized_reps : [];
  if (repName) {
    authorizedReps.push({ name: repName, designation: repDesignation, phone: repPhone });
  }

  const { data: row, error } = await supabase
    .from("client_onboardings")
    .upsert(
      {
        project_id: projectId,
        billing_address: billingAddress,
        gstin,
        pan,
        authorized_reps: authorizedReps,
        communication_preference: communicationPreference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "client_onboarding",
    p_entity_id: row.id,
    p_action: "UPSERT",
    p_before: null,
    p_after: { projectId },
  });

  revalidatePath(`/projects/${projectId}/onboarding`);
  return null;
}

export async function completeOnboarding(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase.from("client_onboardings").select("id").eq("project_id", projectId).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("client_onboardings")
      .update({ status: "COMPLETE", completed_at: new Date().toISOString(), completed_by_id: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("project_id", projectId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("client_onboardings")
      .insert({ project_id: projectId, status: "COMPLETE", completed_at: new Date().toISOString(), completed_by_id: user?.id ?? null });
    if (error) return { error: error.message };
  }

  await supabase.rpc("write_audit", {
    p_entity: "client_onboarding",
    p_entity_id: projectId,
    p_action: "COMPLETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/projects/${projectId}/onboarding`);
  return {};
}

export async function reopenOnboarding(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_onboardings")
    .update({ status: "PENDING", completed_at: null, completed_by_id: null, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/onboarding`);
  return {};
}
