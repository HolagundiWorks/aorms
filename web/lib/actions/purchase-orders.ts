"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type PurchaseOrderActionState = { error: string } | null;

export async function createPurchaseOrderRecord(
  _prev: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const totalRaw = String(formData.get("totalPaise") ?? "").trim();
  const datePo = String(formData.get("datePo") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };

  const totalPaise = totalRaw ? Math.round(Number(totalRaw) * 100) : 0;
  if (!Number.isFinite(totalPaise)) return { error: "Total must be a number." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "purchaseorder",
    p_default_prefix: "PO",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("purchase_orders")
    .insert({ ref: refData, project_id: projectId, vendor, title, total_paise: totalPaise, date_po: datePo, notes })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "purchase_order",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, vendor, title, totalPaise },
  });

  revalidatePath("/purchase-orders");
  return null;
}

export type PoItemActionState = { error: string } | null;

/**
 * PO line items — Phase 3's own flagged gap ("purchase orders have no
 * line-item (po_items) UI yet"). No recompute trigger exists on po_items
 * (checked live), so amount_paise is computed here, matching qty × rate.
 */
export async function addPoItemRecord(
  _prev: PoItemActionState,
  formData: FormData,
): Promise<PoItemActionState> {
  const poId = String(formData.get("poId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const qtyRaw = String(formData.get("qty") ?? "0").trim();
  const rateRaw = String(formData.get("ratePaise") ?? "0").trim();

  if (!poId) return { error: "Missing purchase order." };
  if (!description) return { error: "Description is required." };

  const qty = Number(qtyRaw);
  const ratePaise = rateRaw ? Math.round(Number(rateRaw) * 100) : 0;
  if (!Number.isFinite(qty) || !Number.isFinite(ratePaise)) {
    return { error: "Quantity and rate must be numbers." };
  }
  const amountPaise = Math.round(qty * ratePaise);

  const supabase = await createClient();

  const { count } = await supabase
    .from("po_items")
    .select("id", { count: "exact", head: true })
    .eq("po_id", poId);

  const { data: inserted, error } = await supabase
    .from("po_items")
    .insert({
      po_id: poId,
      description,
      unit: unit || null,
      qty,
      rate_paise: ratePaise,
      amount_paise: amountPaise,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Keep the PO header's total in sync with its line items — no trigger
  // does this (checked live), so it's done here, same as the header total
  // recompute other list-of-line-items domains handle in the action layer.
  const { data: items } = await supabase.from("po_items").select("amount_paise").eq("po_id", poId);
  const totalPaise = (items ?? []).reduce((sum, it) => sum + it.amount_paise, 0);
  await supabase.from("purchase_orders").update({ total_paise: totalPaise }).eq("id", poId);

  await supabase.rpc("write_audit", {
    p_entity: "po_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { poId, description, qty, ratePaise, amountPaise },
  });

  revalidatePath(`/purchase-orders/${poId}`);
  return null;
}

export async function removePoItem(itemId: string, poId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("po_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  const { data: items } = await supabase.from("po_items").select("amount_paise").eq("po_id", poId);
  const totalPaise = (items ?? []).reduce((sum, it) => sum + it.amount_paise, 0);
  await supabase.from("purchase_orders").update({ total_paise: totalPaise }).eq("id", poId);

  revalidatePath(`/purchase-orders/${poId}`);
  return {};
}
