"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createSteelCert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const issuedKg = String(formData.get("issuedKg") ?? "").trim();
  const consumedKg = String(formData.get("consumedKg") ?? "").trim();
  const narrative = String(formData.get("narrative") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!periodStart || !periodEnd) return { error: "Period start and end are required." };

  const issued = issuedKg ? Number(issuedKg) : 0;
  const consumed = consumedKg ? Number(consumedKg) : 0;
  const wastagePct = issued > 0 ? Math.round(((issued - consumed) / issued) * 10000) / 100 : 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "pmc_steel_cert",
    p_default_prefix: "STL",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("pmc_steel_certs")
    .insert({
      project_id: projectId,
      ref: refData,
      period_start: periodStart,
      period_end: periodEnd,
      issued_kg: issued,
      consumed_kg: consumed,
      wastage_pct: wastagePct,
      narrative,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_steel_cert",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData },
  });

  revalidatePath("/pmc-steel-certs");
  return null;
}

const STATUSES = ["DRAFT", "SITE_CHECKED", "CERTIFIED", "SENT_TO_CLIENT", "CLOSED"];

/**
 * The CERTIFIED transition is additionally gated by cost:approve — enforced
 * as a Postgres trigger (assert_cost_approve_for_certify(), migration
 * 0014), not just this action. A user without that capability gets the
 * trigger's own exception surfaced here, not a silently-ignored update.
 */
export async function updateSteelCertStatus(certId: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "CERTIFIED") {
    patch.certified_at = new Date().toISOString();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    patch.certified_by_id = user?.id ?? null;
  }
  if (status === "SENT_TO_CLIENT") patch.sent_at = new Date().toISOString();

  const { error } = await supabase.from("pmc_steel_certs").update(patch).eq("id", certId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_steel_cert",
    p_entity_id: certId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/pmc-steel-certs");
  return {};
}
