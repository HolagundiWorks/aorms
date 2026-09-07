"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Firm settings — a Postgres singleton row (migration 0024 seeded it; the
 * table's own RLS only allows UPDATE, never INSERT, matching the "exactly
 * one row, always exists" design). Gated to OWNER/PARTNER at the RLS layer
 * already — this action doesn't re-check the role, same as every other
 * domain here.
 *
 * GST/PAN/COA/architect/address/TDS fields moved to the AORMS Identity
 * portal's company profile (platform/supabase/migrations/
 * 0003_company_profile.sql) — see the AORMS Identity/Licence portal split
 * plan. This action now only ever writes company_name/firm_type; those
 * columns still exist on `firm` (invoices/PDF generation still read them
 * directly — web/lib/actions/invoices.ts, web/lib/jobs/firm.ts) but are no
 * longer editable from here, only mirrored read-only
 * (FirmSettingsForm.tsx). Deliberately not accepting those fields from
 * `formData` at all any more, rather than relying on the form's
 * readOnly/disabled inputs to keep them unchanged — a disabled `<Select>`/
 * `<Checkbox>` doesn't submit a value at all, which would have silently
 * reset gstType/tdsApplicableDefault to their form defaults on every save
 * had this action still tried to read them.
 */

export type FirmSettingsActionState = { error: string } | null;

export async function updateFirmSettings(
  _prev: FirmSettingsActionState,
  formData: FormData,
): Promise<FirmSettingsActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const firmType = String(formData.get("firmType") ?? "SOLO");

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", firm.id);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "firm",
    p_entity_id: firm.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { companyName, firmType },
  });

  revalidatePath("/firm-settings");
  return null;
}
