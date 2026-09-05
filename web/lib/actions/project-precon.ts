"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { canDecidePhaseGate, type ConsPhaseGateDecision } from "../project-precon";

type ActionState = { error: string } | null;

export async function createRisk(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const likelihood = Number(formData.get("likelihood") ?? 3);
  const impact = Number(formData.get("impact") ?? 3);
  const owner = String(formData.get("owner") ?? "").trim() || null;
  const response = String(formData.get("response") ?? "REDUCE");
  const mitigation = String(formData.get("mitigation") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("project_risks")
    .insert({ project_id: projectId, title, likelihood, impact, owner, response, mitigation, residual_likelihood: likelihood, residual_impact: impact })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_risk",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title },
  });

  revalidatePath(`/projects/${projectId}/precon`);
  return null;
}

const RISK_STATUSES = ["OPEN", "MITIGATED", "CLOSED"];

export async function setRiskStatus(projectId: string, riskId: string, status: string): Promise<{ error?: string }> {
  if (!RISK_STATUSES.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase.from("project_risks").update({ status, updated_at: new Date().toISOString() }).eq("id", riskId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/precon`);
  return {};
}

export async function createOpportunity(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "WORKSHOP");
  const area = String(formData.get("area") ?? "DESIGN");
  const probability = Number(formData.get("probability") ?? 3);
  const impact = Number(formData.get("impact") ?? 3);
  const response = String(formData.get("response") ?? "ENHANCE");
  const owner = String(formData.get("owner") ?? "").trim() || null;
  const actionPlan = String(formData.get("actionPlan") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("project_opportunities")
    .insert({ project_id: projectId, title, source, area, probability, impact, response, owner, action_plan: actionPlan })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_opportunity",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title },
  });

  revalidatePath(`/projects/${projectId}/precon`);
  return null;
}

const OPPORTUNITY_STATUSES = ["OPEN", "IN_PROGRESS", "REALIZED", "CLOSED"];

export async function setOpportunityStatus(projectId: string, opportunityId: string, status: string): Promise<{ error?: string }> {
  if (!OPPORTUNITY_STATUSES.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase.from("project_opportunities").update({ status, updated_at: new Date().toISOString() }).eq("id", opportunityId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/precon`);
  return {};
}

/**
 * Port of upsertPhaseGate (backend/src/modules/project-precon/router.ts) —
 * canDecidePhaseGate() is re-checked server-side, not just in the UI:
 * GO requires every shared checklist item true.
 */
export async function upsertPhaseGate(
  projectId: string,
  gateKey: string,
  decision: ConsPhaseGateDecision,
  checklist: Record<string, boolean>,
  notes: string | null,
): Promise<{ error?: string }> {
  const gate = canDecidePhaseGate({ decision, checklist });
  if (!gate.ok) return { error: gate.reason };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const decided =
    decision === "PENDING"
      ? { decided_by: null, decided_by_name: null, decided_at: null }
      : { decided_by: user?.id ?? null, decided_by_name: profile?.full_name ?? null, decided_at: new Date().toISOString() };

  const { error } = await supabase
    .from("project_phase_gates")
    .upsert(
      { project_id: projectId, gate_key: gateKey, checklist, decision, notes, ...decided, updated_at: new Date().toISOString() },
      { onConflict: "project_id,gate_key" },
    );
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_phase_gate",
    p_entity_id: projectId,
    p_action: "UPSERT",
    p_before: null,
    p_after: { gateKey, decision },
  });

  revalidatePath(`/projects/${projectId}/precon`);
  return {};
}
