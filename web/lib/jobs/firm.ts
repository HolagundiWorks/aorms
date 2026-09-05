import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The flat shape worker/esti_worker/jobs/pdf.py's HTML templates expect in
 * a render_pdf job's `firm` field (legalName/addressLines/coaRegNo/logoKey)
 * — mapped here from the `firm` table's own column names, since the two
 * schemas were never meant to share field names (extracted from
 * lib/actions/invoices.ts's original inline version so every "Generate
 * PDF" action fetches+maps the same way instead of repeating it 10 times).
 */
export type FirmForPdf = {
  legalName: string;
  gstin: string;
  pan: string;
  coaRegNo: string;
  email: string;
  phone: string;
  addressLines: string[];
};

export async function getFirmForPdf(
  // Avoids importing "../supabase/server" here — that helper is async and
  // request-scoped (reads cookies()), so callers pass their own already-
  // created client rather than this module creating a second one.
  supabase: SupabaseClient,
): Promise<{ firm: FirmForPdf; error?: never } | { firm?: never; error: string }> {
  const { data: firm, error } = await supabase
    .from("firm")
    .select(
      "company_name, gstin, pan, coa_reg_no, email, phone, address_line1, address_line2, city, state, pincode",
    )
    .eq("singleton", true)
    .maybeSingle();
  if (error) return { error: error.message };

  const addressLines = [
    firm?.address_line1,
    firm?.address_line2,
    [firm?.city, firm?.state, firm?.pincode].filter(Boolean).join(" "),
  ].filter((line): line is string => !!line && line.trim().length > 0);

  return {
    firm: {
      legalName: firm?.company_name ?? "",
      gstin: firm?.gstin ?? "",
      pan: firm?.pan ?? "",
      coaRegNo: firm?.coa_reg_no ?? "",
      email: firm?.email ?? "",
      phone: firm?.phone ?? "",
      addressLines,
    },
  };
}
