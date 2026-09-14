import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createPlatformClient } from "../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { PlatformAuthCta } from "../../../components/aorms/platform/PlatformAuthCta";
import { JoinCompanyForm } from "../../../components/aorms/platform/company/JoinCompanyForm";
import { LeaveCompanyButton } from "../../../components/aorms/platform/company/LeaveCompanyButton";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { ConnectDexPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

type CompanyEmbed = { id: string; name: string; public_id: string } | null;

/**
 * My ConnectDeX Companies — the ConnectDeX Portal's own landing page
 * (2026-09-10), split out of app/(platform)/identity/page.tsx's old
 * "Companies" section once Identity became Studio-only (see
 * docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals).
 *
 * **2026-09-14 rewrite — Company/ConnectDeX identity split (platform
 * migration 0024):** this page used to resolve the caller via the Office
 * Hub session → profiles.platform_public_id → `accounts` (the same
 * portable-identity link Studio pages use) — that's no longer correct.
 * Company membership now lives on its own `company_accounts` identity
 * (AORMS-CU-), resolved from the AORMS Platform's OWN session directly
 * (createPlatformClient, same as getCurrentPlatformSessionAccount() does
 * for Studio/staff — see lib/platform/account.ts), with no Office Hub link
 * involved at all. A Company identity is only ever minted via an admin's
 * ConnectDeX invite (adminInviteConnectDexApplication), never self-signup,
 * so an AORMS Identity/Studio account and a Company account are always two
 * separate logins — the explicit, accepted tradeoff of the split.
 *
 * Creating a brand-new Company is no longer instant self-serve — it goes
 * through the gated ConnectDeX onboarding pipeline
 * (platform/supabase/migrations/0013_connectdex_onboarding.sql): this
 * page links to /connectdex-apply rather than offering a create form.
 * Joining an already-active Company as a team member is unaffected
 * (JoinCompanyForm, same as before).
 */
export default async function ConnectDexPage() {
  const platformSupabase = await createPlatformClient();
  const {
    data: { user: platformUser },
  } = await platformSupabase.auth.getUser();

  const platformService = createPlatformServiceRoleClient();
  const cx = platformService.schema("connectdex");
  const { data: companyAccount } = platformUser
    ? await cx.from("company_accounts").select("id, public_id, full_name").eq("id", platformUser.id).maybeSingle()
    : { data: null };

  if (!platformUser || !companyAccount) {
    return (
      <>
        <ConnectDexPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader
              title="ConnectDeX"
              description="Sign in with your AORMS Company account — a separate login from an AORMS Identity/Studio account."
            />
            <Tile>
              <Stack gap={5}>
                {!platformUser ? (
                  <PlatformAuthCta />
                ) : (
                  <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                    You&apos;re signed in to the AORMS Platform, but not with a Company account — Company (ConnectDeX)
                    membership needs its own login, separate from any AORMS Identity/Studio account. Apply below, or ask an
                    AORMS admin to invite your company email.
                  </p>
                )}
                <NextLink href="/connectdex-apply" className="cds--link">
                  Apply to become a ConnectDeX Partner →
                </NextLink>
              </Stack>
            </Tile>
          </Column>
        </Grid>
      </>
    );
  }

  const { data: companyMemberships } = await cx
    .from("company_memberships")
    .select("id, role, status, companies(id, name, public_id)")
    .eq("account_id", companyAccount.id)
    .neq("status", "LEFT")
    .order("created_at", { ascending: true });

  return (
    <>
      <ConnectDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader title="My Company" description="Every material or interior-supplier company you belong to." />

          <Stack gap={6}>
            <div>
              <Stack gap={4}>
                {(companyMemberships ?? []).map((m) => {
                  const company = (Array.isArray(m.companies) ? m.companies[0] : m.companies) as CompanyEmbed;
                  if (!company) return null;
                  return (
                    <Tile key={m.id}>
                      <Stack gap={3} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <NextLink href={`/companies/${company.id}`}>
                            <strong>{company.name}</strong>
                          </NextLink>{" "}
                          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            {company.public_id}
                          </span>
                          <div>
                            <Tag type={m.role === "OWNER" ? "purple" : "gray"} size="sm">
                              {m.role}
                            </Tag>
                          </div>
                        </div>
                        <LeaveCompanyButton membershipId={m.id} companyName={company.name} />
                      </Stack>
                    </Tile>
                  );
                })}
                {(companyMemberships ?? []).length === 0 && (
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    Not a member of any company yet.
                  </p>
                )}
              </Stack>
            </div>

            <Stack gap={6} orientation="horizontal">
              <Tile style={{ flex: 1 }}>
                {/* Instant self-serve company creation removed 2026-09-10 —
                    a Company is now only ever created via the ConnectDeX
                    Partners gated onboarding pipeline (an admin's invite
                    action, not a user's own insert — see
                    platform/supabase/migrations/
                    0013_connectdex_onboarding.sql). */}
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Become a ConnectDeX Partner
                </h3>
                <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
                  Material and interior suppliers apply for their own Company account through a short review process.
                </p>
                <NextLink href="/connectdex-apply" className="cds--link">
                  Apply now →
                </NextLink>
              </Tile>
              <Tile style={{ flex: 1 }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Join a company
                </h3>
                <JoinCompanyForm />
              </Tile>
            </Stack>
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
