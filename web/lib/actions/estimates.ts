"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type EstimateActionState = { error: string } | null;

export async function createEstimateRecord(
  _prev: EstimateActionState,
  formData: FormData,
): Promise<EstimateActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const rateBookId = String(formData.get("rateBookId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const contingencyPctRaw = String(formData.get("contingencyPct") ?? "0").trim();
  const gstPctRaw = String(formData.get("gstPct") ?? "0").trim();
  // Markup cascade (port of AQC's EstimateMarkups — see lib/tax/estimate-
  // markups.ts) — defaults match its own Reset() values, a real DSR-abstract
  // convention, not arbitrary.
  const electricalPctRaw = String(formData.get("electricalPct") ?? "8").trim();
  const plumbingPctRaw = String(formData.get("plumbingPct") ?? "6").trim();
  const escalationPctRaw = String(formData.get("escalationPct") ?? "5").trim();
  const consultingFeePctRaw = String(formData.get("consultingFeePct") ?? "3").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!rateBookId) return { error: "Rate book is required." };
  if (!title) return { error: "Title is required." };

  const contingencyPct = Number(contingencyPctRaw);
  const gstPct = Number(gstPctRaw);
  const electricalPct = Number(electricalPctRaw);
  const plumbingPct = Number(plumbingPctRaw);
  const escalationPct = Number(escalationPctRaw);
  const consultingFeePct = Number(consultingFeePctRaw);
  if (
    ![contingencyPct, gstPct, electricalPct, plumbingPct, escalationPct, consultingFeePct].every(Number.isFinite)
  ) {
    return { error: "All percentage fields must be numbers." };
  }

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "estimate",
    p_default_prefix: "EST",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("estimates")
    .insert({
      ref: refData,
      project_id: projectId,
      rate_book_id: rateBookId,
      title,
      contingency_pct: contingencyPct,
      gst_pct: gstPct,
      electrical_pct: electricalPct,
      plumbing_pct: plumbingPct,
      escalation_pct: escalationPct,
      consulting_fee_pct: consultingFeePct,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "estimate",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, rateBookId, title, contingencyPct, gstPct },
  });

  revalidatePath("/estimates");
  return null;
}

export type EstimateItemActionState = { error: string } | null;

export async function createEstimateItemRecord(
  _prev: EstimateItemActionState,
  formData: FormData,
): Promise<EstimateItemActionState> {
  const estimateId = String(formData.get("estimateId") ?? "").trim();
  const rateBookItemId = String(formData.get("rateBookItemId") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "0").trim();
  const rateRaw = String(formData.get("ratePaise") ?? "0").trim();

  if (!estimateId) return { error: "Missing estimate." };
  if (!description) return { error: "Description is required." };
  if (!unit) return { error: "Unit is required." };

  const quantity = Number(quantityRaw);
  const ratePaise = rateRaw ? Math.round(Number(rateRaw) * 100) : 0;
  if (!Number.isFinite(quantity) || !Number.isFinite(ratePaise)) {
    return { error: "Quantity and rate must be numbers." };
  }

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("estimate_items")
    .insert({
      estimate_id: estimateId,
      rate_book_item_id: rateBookItemId,
      description,
      unit,
      quantity,
      rate_paise: ratePaise,
    })
    .select("id")
    .single();

  // The estimate-editable-lock trigger (assert_estimate_editable) surfaces as
  // a Postgres exception here if the parent estimate is APPROVED/CANCELLED —
  // its message is already user-facing ("This estimate is approved...").
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "estimate_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { estimateId, rateBookItemId, description, unit, quantity, ratePaise },
  });

  revalidatePath(`/estimates/${estimateId}`);
  return null;
}
