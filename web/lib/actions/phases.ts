"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type PhaseActionState = { error: string } | null;

export async function createPhaseRecord(
  _prev: PhaseActionState,
  formData: FormData,
): Promise<PhaseActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const billingPctRaw = String(formData.get("billingPct") ?? "").trim();
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();

  if (!projectId) return { error: "Missing project." };
  if (!code) return { error: "Phase code is required." };
  if (!label) return { error: "Phase label is required." };

  const billingPct = billingPctRaw ? Number(billingPctRaw) : 0;
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;
  if (!Number.isFinite(billingPct)) return { error: "Billing % must be a number." };
  if (!Number.isFinite(sortOrder)) return { error: "Sort order must be a number." };

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("phases")
    .insert({
      project_id: projectId,
      code,
      label,
      billing_pct: billingPct,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "phase",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, code, label, billingPct, sortOrder },
  });

  revalidatePath(`/projects/${projectId}`);
  return null;
}
