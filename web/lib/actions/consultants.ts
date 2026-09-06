"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Consultants — the staff-facing directory + engagement CRUD side of
 * migration 0021 (which only built the Collaborator Portal's read/submit
 * side; the directory itself had RLS from day one but no UI, same gap
 * `/contractors` had before this). `createLogin` (provisioning a
 * CONSULTANT-role portal login) isn't ported here either — that's a
 * Supabase Auth admin operation, a materially different kind of feature
 * from this table's own CRUD.
 */

export type ConsultantActionState = { error: string } | null;

export async function createConsultant(
  _prev: ConsultantActionState,
  formData: FormData,
): Promise<ConsultantActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const discipline = String(formData.get("discipline") ?? "").trim();
  const firm = String(formData.get("firm") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!discipline) return { error: "Discipline is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("consultants")
    .insert({ name, discipline, firm, email, phone })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "consultant",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, discipline },
  });

  revalidatePath("/consultants");
  return null;
}

export type EngagementActionState = { error: string } | null;

export async function createEngagement(
  _prev: EngagementActionState,
  formData: FormData,
): Promise<EngagementActionState> {
  const consultantId = String(formData.get("consultantId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim() || null;
  const agreedFeeRaw = String(formData.get("agreedFeePaise") ?? "0").trim();
  const status = String(formData.get("status") ?? "ENGAGED");

  if (!consultantId) return { error: "Missing consultant." };
  if (!projectId) return { error: "Project is required." };

  const agreedFeePaise = agreedFeeRaw ? Math.round(Number(agreedFeeRaw) * 100) : 0;
  if (!Number.isFinite(agreedFeePaise)) return { error: "Agreed fee must be a number." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("engagements")
    .insert({ consultant_id: consultantId, project_id: projectId, scope, agreed_fee_paise: agreedFeePaise, status })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "engagement",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { consultantId, projectId, scope, agreedFeePaise },
  });

  revalidatePath(`/consultants/${consultantId}`);
  return null;
}

const ENGAGEMENT_STATUSES = ["ENGAGED", "COMPLETED", "TERMINATED"];

export async function updateEngagementStatus(
  engagementId: string,
  consultantId: string,
  status: string,
): Promise<{ error?: string }> {
  if (!ENGAGEMENT_STATUSES.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("engagements")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", engagementId);
  if (error) return { error: error.message };

  revalidatePath(`/consultants/${consultantId}`);
  return {};
}

export async function recordEngagementPayment(
  _prev: EngagementActionState,
  formData: FormData,
): Promise<EngagementActionState> {
  const engagementId = String(formData.get("engagementId") ?? "").trim();
  const consultantId = String(formData.get("consultantId") ?? "").trim();
  const amountRaw = String(formData.get("amountPaise") ?? "0").trim();

  if (!engagementId) return { error: "Missing engagement." };
  const amountPaise = amountRaw ? Math.round(Number(amountRaw) * 100) : 0;
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return { error: "Enter a valid payment amount." };

  const supabase = await createClient();
  const { data: engagement, error: fetchError } = await supabase
    .from("engagements")
    .select("paid_paise")
    .eq("id", engagementId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!engagement) return { error: "Engagement not found." };

  const { error } = await supabase
    .from("engagements")
    .update({ paid_paise: engagement.paid_paise + amountPaise, updated_at: new Date().toISOString() })
    .eq("id", engagementId);
  if (error) return { error: error.message };

  revalidatePath(`/consultants/${consultantId}`);
  return null;
}
