"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Firm settings — a Postgres singleton row (migration 0024 seeded it; the
 * table's own RLS only allows UPDATE, never INSERT, matching the "exactly
 * one row, always exists" design). Surfaced as a real gap while wiring the
 * invoice tax engine: every firm-level default (GST system, state, GSTIN,
 * TDS default) was silently falling back to code defaults with nothing to
 * actually read. Gated to OWNER/PARTNER at the RLS layer already — this
 * action doesn't re-check the role, same as every other domain here.
 */

export type FirmSettingsActionState = { error: string } | null;

export async function updateFirmSettings(
  _prev: FirmSettingsActionState,
  formData: FormData,
): Promise<FirmSettingsActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const firmType = String(formData.get("firmType") ?? "SOLO");
  const gstType = String(formData.get("gstType") ?? "REGULAR");
  const gstin = String(formData.get("gstin") ?? "").trim() || null;
  const pan = String(formData.get("pan") ?? "").trim() || null;
  const architectName = String(formData.get("architectName") ?? "").trim() || null;
  const coaRegNo = String(formData.get("coaRegNo") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim() || null;
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const pincode = String(formData.get("pincode") ?? "").trim() || null;
  const tdsApplicableDefault = formData.get("tdsApplicableDefault") === "on";

  if (!companyName) return { error: "Company name is required." };

  const supabase = await createClient();

  const { data: firm, error: firmError } = await supabase.from("firm").select("id").limit(1).maybeSingle();
  if (firmError) return { error: firmError.message };
  if (!firm) return { error: "No firm record exists to update — this should have been seeded by migration 0024." };

  const { error } = await supabase
    .from("firm")
    .update({
      company_name: companyName,
      firm_type: firmType,
      gst_type: gstType,
      gstin,
      pan,
      architect_name: architectName,
      coa_reg_no: coaRegNo,
      email,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      district,
      state,
      pincode,
      tds_applicable_default: tdsApplicableDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", firm.id);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "firm",
    p_entity_id: firm.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { companyName, gstType, state },
  });

  revalidatePath("/firm-settings");
  return null;
}
