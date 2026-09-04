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
