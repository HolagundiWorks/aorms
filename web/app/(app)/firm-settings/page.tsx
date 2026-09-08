import {
  Column,
  Grid,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { FirmSettingsForm } from "../../../components/aorms/FirmSettingsForm";
import { NewNumberingPatternForm } from "../../../components/aorms/NewNumberingPatternForm";
import { RemoveLineItemButton } from "../../../components/aorms/RemoveLineItemButton";
import { removeNumberingPatternRecord } from "../../../lib/actions/numbering";

/**
 * Firm Settings — the singleton `firm` row (migration 0024 seeded it after
 * this session's tax-engine work found the live project had zero rows).
 * RLS gates the update to OWNER/PARTNER already ("firm: owner/partner
 * update"); a VIEWER/ASSOCIATE etc. opening this page just sees a save
 * that silently fails via RLS today — a clearer "you can't edit this"
 * state is a possible follow-up, not attempted here.
 *
 * GST/PAN/COA/architect/address fields are now a **read-only mirror**
 * (FirmSettingsForm.tsx) — the AORMS Identity portal's company profile
 * (/companies/[id]) is the actual place to edit them now (see the AORMS
 * Identity/Licence portal split plan). Kept here, unchanged, because
 * web/lib/actions/invoices.ts's GST/TDS calculation and
 * web/lib/jobs/firm.ts's PDF generation both still read these columns
 * directly from this table — no schema change, no sync back from the
 * Identity portal in this pass (a disclosed limitation, not an oversight).
 */
export default async function FirmSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: firm, error }, { data: myProfile }, { data: patterns, error: patternsError }] = await Promise.all([
    supabase
      .from("firm")
      .select(
        "company_name, firm_type, gst_type, gstin, pan, architect_name, coa_reg_no, email, phone, address_line1, address_line2, city, district, state, pincode, tds_applicable_default",
      )
      .limit(1)
      .maybeSingle(),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("numbering_patterns").select("id, scope, prefix, padding").order("scope"),
  ]);

  const isOwner = myProfile?.role === "OWNER";
  const canEditFirm = isOwner || myProfile?.role === "PARTNER";

  return (
    <Grid>
      <Column sm={4} md={8} lg={12}>
        <h1 className="cds--type-heading-05">Firm Settings</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Company profile, GST/tax defaults, and address — used across invoices, PDFs, and portal branding.
        </p>

        {!canEditFirm && (
          <InlineNotification
            kind="info"
            title="Read-only"
            subtitle="Only the firm owner or a partner can change the company profile — you can still see what's set below."
            hideCloseButton
            lowContrast
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load firm settings: {error.message}
          </p>
        ) : !firm ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            No firm record exists. This should have been seeded by migration 0024 — contact support.
          </p>
        ) : (
          <FirmSettingsForm key={JSON.stringify(firm)} firm={firm} canEdit={canEditFirm} />
        )}

        <h2 className="cds--type-heading-03" style={{ marginTop: "3rem", marginBottom: "0.5rem" }}>
          Reference Numbering
        </h2>
        <p
          className="cds--type-body-01"
          style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Override the prefix and/or digit-padding used for a document scope&apos;s reference numbers (e.g.{" "}
          <code>LTR/2026-27/0001</code>). A scope with no override here uses its built-in default.
        </p>

        {!isOwner && (
          <InlineNotification
            kind="info"
            title="Read-only"
            subtitle="Only the firm owner can change numbering overrides — you can still see what's set."
            hideCloseButton
            lowContrast
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        {patternsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load numbering overrides: {patternsError.message}
          </p>
        ) : (
          <>
            <Table aria-label="Numbering overrides" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Scope</TableHeader>
                  <TableHeader>Prefix</TableHeader>
                  <TableHeader>Padding</TableHeader>
                  {isOwner && <TableHeader>Remove</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(patterns ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.scope}</TableCell>
                    <TableCell>{p.prefix ?? "—"}</TableCell>
                    <TableCell>{p.padding ?? "—"}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <RemoveLineItemButton action={removeNumberingPatternRecord.bind(null, p.id)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(patterns ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 4 : 3}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No overrides set — every scope is using its default prefix and 4-digit padding.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {isOwner && (
              <div style={{ marginTop: "1.5rem" }}>
                <NewNumberingPatternForm />
              </div>
            )}
          </>
        )}
      </Column>
    </Grid>
  );
}
