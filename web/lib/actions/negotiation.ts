"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { conversionProbability } from "../project-os";

type ActionState = { error: string } | null;

export async function addNegotiationRound(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const feeChangeRupees = String(formData.get("feeChange") ?? "").trim() || "0";
  const scopeChanges = String(formData.get("scopeChanges") ?? "").trim() || null;
  const timelineChanges = String(formData.get("timelineChanges") ?? "").trim() || null;
  const discountRequestedPct = Number(String(formData.get("discountRequestedPct") ?? "0").trim() || "0");
  const architectResponse = String(formData.get("architectResponse") ?? "").trim() || null;
  const clientResponse = String(formData.get("clientResponse") ?? "").trim() || null;
  const outcome = String(formData.get("outcome") ?? "ONGOING");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing, error: existingError } = await supabase
    .from("project_negotiations")
    .select("round_no, discount_requested_pct")
    .eq("project_id", projectId);
  if (existingError) return { error: existingError.message };

  const roundNo = (existing ?? []).reduce((m, r) => Math.max(m, r.round_no), 0) + 1;
  const totalDiscountPct = (existing ?? []).reduce((s, r) => s + Number(r.discount_requested_pct), 0) + discountRequestedPct;
  const probability = conversionProbability({ rounds: roundNo, totalDiscountPct });

  const { data: inserted, error } = await supabase
    .from("project_negotiations")
    .insert({
      project_id: projectId,
      round_no: roundNo,
      fee_change_paise: Math.round(Number(feeChangeRupees) * 100),
      scope_changes: scopeChanges,
      timeline_changes: timelineChanges,
      discount_requested_pct: discountRequestedPct,
      architect_response: architectResponse,
      client_response: clientResponse,
      outcome,
      conversion_probability: probability,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_negotiation",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, roundNo, probability },
  });

  revalidatePath(`/projects/${projectId}/negotiation`);
  return null;
}

const OUTCOMES = ["ONGOING", "AGREED", "STALLED", "WITHDRAWN"];

export async function setNegotiationOutcome(projectId: string, negotiationId: string, outcome: string): Promise<{ error?: string }> {
  if (!OUTCOMES.includes(outcome)) return { error: "Invalid outcome." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("project_negotiations").select("outcome").eq("id", negotiationId).maybeSingle();
  const { error } = await supabase.from("project_negotiations").update({ outcome }).eq("id", negotiationId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_negotiation",
    p_entity_id: negotiationId,
    p_action: "OUTCOME",
    p_before: { outcome: before?.outcome },
    p_after: { outcome },
  });

  revalidatePath(`/projects/${projectId}/negotiation`);
  return {};
}
