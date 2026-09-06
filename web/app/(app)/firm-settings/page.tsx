import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { FirmSettingsForm } from "../../../components/aorms/FirmSettingsForm";

/**
 * Firm Settings — the singleton `firm` row (migration 0024 seeded it after
 * this session's tax-engine work found the live project had zero rows).
 * RLS gates the update to OWNER/PARTNER already ("firm: owner/partner
 * update"); a VIEWER/ASSOCIATE etc. opening this page just sees a save
 * that silently fails via RLS today — a clearer "you can't edit this"
 * state is a possible follow-up, not attempted here.
 */
export default async function FirmSettingsPage() {
  const supabase = await createClient();

  const { data: firm, error } = await supabase
    .from("firm")
    .select(
      "company_name, firm_type, gst_type, gstin, pan, architect_name, coa_reg_no, email, phone, address_line1, address_line2, city, district, state, pincode, tds_applicable_default",
    )
    .limit(1)
    .maybeSingle();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={12}>
        <h1 className="cds--type-heading-05">Firm Settings</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Company profile, GST/tax defaults, and address — used across invoices, PDFs, and portal branding.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load firm settings: {error.message}
          </p>
        ) : !firm ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            No firm record exists. This should have been seeded by migration 0024 — contact support.
          </p>
        ) : (
          <FirmSettingsForm firm={firm} />
        )}
      </Column>
    </Grid>
  );
}
