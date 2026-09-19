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
import { AddNumberingPatternForm } from "../../../components/aorms/AddNumberingPatternForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { FirmSettingsForm } from "../../../components/aorms/FirmSettingsForm";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { RemoveLineItemButton } from "../../../components/aorms/RemoveLineItemButton";
import { removeNumberingPatternRecord } from "../../../lib/actions/numbering";
import { LinkFirmStudioForm } from "../../../components/aorms/platform/LinkFirmStudioForm";
import { getFirmStudio } from "../../../lib/platform/firm-studio";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";

/**
 * Firm Settings — the caller's own `firms` row (one per Studio as of
 * migration 0053; originally seeded as a Postgres singleton by migration
 * 0024). RLS gates the update to OWNER/PARTNER already ("firm: owner/
 * partner update"); a VIEWER/ASSOCIATE etc. opening this page just sees a
 * save that silently fails via RLS today — a clearer "you can't edit this"
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
      .from("firms")
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
  const firmStudio = await getFirmStudio();
  const driveConnection = firmStudio
    ? (
        await createPlatformServiceRoleClient()
          .from("drive_connections")
          .select("google_account_email, status")
          .eq("studio_id", firmStudio.id)
          .maybeSingle()
      ).data
    : null;

  return (
    <ContextPanelLayout>
      {isOwner && (
        <ContextPanel title="Add numbering override" description="Override the prefix and/or digit-padding for a document scope.">
          <AddNumberingPatternForm />
        </ContextPanel>
      )}
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={12}>
        <PageHeader
          title="Firm Settings"
          description="Company profile, GST/tax defaults, and address — used across invoices, PDFs, and portal branding."
        />

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

        {/* AORMS Platform Studio link (2026-09-14) — which Studio this
            deployment belongs to, gating the free-tier client/contractor
            caps (lib/platform/firm-studio.ts). Same OWNER/PARTNER gate as
            the rest of this page. */}
        <div style={{ marginTop: "3rem" }}>
          <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
            AORMS Platform Studio
          </h2>
          <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
            Links this deployment to one Studio on the AORMS Platform — a free-tier Studio caps this firm at 3
            clients and 3 contractors; Pro/Enterprise removes the cap.
          </p>
          {firmStudio ? (
            <p className="cds--type-body-01">
              Linked to <strong>{firmStudio.name}</strong> ({firmStudio.public_id}) — {firmStudio.plan} plan.
            </p>
          ) : canEditFirm ? (
            <LinkFirmStudioForm />
          ) : (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Not linked to a Studio yet — only the firm owner or a partner can link one.
            </p>
          )}
        </div>

        {/* Google Drive (docs/esti/AORMS-V2-DEVELOPER-GUIDELINES.md § 6-7,
            2026-09-20; relocated to the AORMS Platform, studio_id-keyed,
            same day — see platform/supabase/migrations/0039_drive_connector.sql).
            Document storage stays in the firm's own Drive; AORMS only
            stores the connection + file metadata (documents table). The
            connection itself is managed on the linked Studio's own page
            now, not here — this is a read-only status mirror, same
            pattern as "AORMS Platform Studio" above. */}
        <div style={{ marginTop: "3rem" }}>
          <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
            Google Drive
          </h2>
          <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
            Documents live in your own Drive — AORMS stores the connection and each file&apos;s project, revision,
            and status, never the file bytes.
          </p>

          {driveConnection?.status === "CONNECTED" ? (
            <p className="cds--type-body-01">
              Connected{driveConnection.google_account_email ? <> as <strong>{driveConnection.google_account_email}</strong></> : null}.
            </p>
          ) : firmStudio ? (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Not connected yet — manage this from{" "}
              <a href={`https://identity.aorms.in/studios/${firmStudio.id}`}>{firmStudio.name}&apos;s Studio page</a> on the AORMS
              Platform.
            </p>
          ) : (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Link this firm to a Platform Studio above first — Google Drive connects from the Studio&apos;s own page.
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginTop: "3rem" }}>
          <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
            Reference Numbering
          </h2>
          {isOwner && <ContextPanelTrigger size="sm">Add override</ContextPanelTrigger>}
        </div>
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
          </>
        )}
      </Column>
      </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
