import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { adminInviteConnectDexApplication, adminRejectConnectDexApplication, adminVerifyConnectDexCompany } from "../../../../lib/actions/connectdex";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { ConnectDexActionButton } from "../../../../components/aorms/platform/company/ConnectDexActionButton";
import { SetConnectDexFeeForm } from "../../../../components/aorms/platform/company/SetConnectDexFeeForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * ConnectDeX Partners admin review — the platform-admin side of the
 * gated onboarding pipeline (platform/supabase/migrations/
 * 0013_connectdex_onboarding.sql). Three action stages plus the flat fee:
 * pending applications (Invite/Reject), companies awaiting manual
 * verification (Verify), and companies awaiting their own payment
 * (informational only — nothing for an admin to do there but wait).
 */
export default async function AdminConnectDexPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="ConnectDeX Partners" />;

  const platformService = createPlatformServiceRoleClient();
  const [{ data: applications }, { data: pendingVerification }, { data: pendingPayment }, { data: settings }] = await Promise.all([
    platformService
      .from("connectdex_applications")
      .select("id, company_name, contact_name, email, phone, city, state, category, message, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true }),
    platformService
      .from("companies")
      .select("id, name, public_id, gstin, pan, address_line1, city, state, email, phone")
      .eq("status", "PENDING_VERIFICATION"),
    platformService.from("companies").select("id, name, public_id").eq("status", "PENDING_PAYMENT"),
    platformService.from("connectdex_settings").select("onboarding_fee_paise").eq("id", true).maybeSingle(),
  ]);

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="ConnectDeX Partners" description="Review applications, verify onboarding details, and set the flat onboarding fee." />

        <Stack gap={7}>
          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Pending applications
            </h2>
            <Stack gap={4}>
              {(applications ?? []).map((application) => (
                <Tile key={application.id}>
                  <Stack gap={3}>
                    <Stack gap={2} orientation="horizontal">
                      <h3 className="cds--type-productive-heading-03">{application.company_name}</h3>
                      <Tag type="cool-gray" size="sm">
                        {application.category}
                      </Tag>
                    </Stack>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {application.contact_name} · {application.email} {application.phone ? `· ${application.phone}` : ""}
                      {application.city ? ` · ${application.city}` : ""}
                      {application.state ? `, ${application.state}` : ""}
                    </p>
                    {application.message && (
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        “{application.message}”
                      </p>
                    )}
                    <Stack gap={3} orientation="horizontal">
                      <ConnectDexActionButton
                        id={application.id}
                        label="Invite"
                        pendingLabel="Inviting…"
                        kind="primary"
                        confirmMessage={`Invite ${application.company_name} and email login details to ${application.email}?`}
                        action={adminInviteConnectDexApplication}
                      />
                      <ConnectDexActionButton
                        id={application.id}
                        label="Reject"
                        pendingLabel="Rejecting…"
                        kind="danger--tertiary"
                        confirmMessage={`Reject ${application.company_name}'s application?`}
                        action={adminRejectConnectDexApplication}
                      />
                    </Stack>
                  </Stack>
                </Tile>
              ))}
              {(applications ?? []).length === 0 && (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  No pending applications.
                </p>
              )}
            </Stack>
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Awaiting verification
            </h2>
            <Stack gap={4}>
              {(pendingVerification ?? []).map((company) => (
                <Tile key={company.id}>
                  <Stack gap={3}>
                    <Stack gap={2} orientation="horizontal">
                      <h3 className="cds--type-productive-heading-03">{company.name}</h3>
                      <Tag type="cool-gray" size="sm">
                        {company.public_id}
                      </Tag>
                    </Stack>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      GSTIN: {company.gstin ?? "—"} · PAN: {company.pan ?? "—"} · {company.address_line1 ?? "—"}, {company.city ?? "—"},{" "}
                      {company.state ?? "—"} · {company.email ?? "—"} {company.phone ? `· ${company.phone}` : ""}
                    </p>
                    <ConnectDexActionButton
                      id={company.id}
                      label="Verify"
                      pendingLabel="Verifying…"
                      kind="primary"
                      confirmMessage={`Mark ${company.name} as verified? This moves them to the payment step.`}
                      action={adminVerifyConnectDexCompany}
                    />
                  </Stack>
                </Tile>
              ))}
              {(pendingVerification ?? []).length === 0 && (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Nothing awaiting verification.
                </p>
              )}
            </Stack>
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Awaiting payment
            </h2>
            <Stack gap={2}>
              {(pendingPayment ?? []).map((company) => (
                <p key={company.id} className="cds--type-body-01">
                  {company.name} ({company.public_id})
                </p>
              ))}
              {(pendingPayment ?? []).length === 0 && (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Nothing awaiting payment.
                </p>
              )}
            </Stack>
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Onboarding fee
            </h2>
            <Tile style={{ maxWidth: 360 }}>
              <SetConnectDexFeeForm feePaise={settings?.onboarding_fee_paise ?? 0} />
            </Tile>
          </div>
        </Stack>
      </Column>
    </Grid>
    </>
  );
}
