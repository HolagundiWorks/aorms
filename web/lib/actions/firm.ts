"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

/**
 * Firm settings — one `firms` row per Studio (migration 0053 converted
 * the old Postgres singleton into a real multi-tenant table; RLS scopes
 * this read/update to the caller's own firm via current_firm_id(), and
 * still allows UPDATE only, never INSERT — a new firm is only ever
 * created via the provision_firm() RPC). Gated to OWNER/PARTNER at the
 * RLS layer already — this action doesn't re-check the role, same as
 * every other domain here.
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

  const { data: firm, error: firmError } = await supabase.from("firms").select("id").maybeSingle();
  if (firmError) return { error: toSafeErrorMessage(firmError) };
  if (!firm) return { error: "No firm record exists to update — this should have been seeded by migration 0024." };

  const { error } = await supabase
    .from("firms")
    .update({
      company_name: companyName,
      firm_type: firmType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", firm.id);
  if (error) return { error: toSafeErrorMessage(error) };

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
