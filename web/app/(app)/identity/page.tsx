import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createClient as createPlatformClient } from "../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { LinkIdentityForm } from "../../../components/aorms/platform/LinkIdentityForm";
import { CreateCompanyForm } from "../../../components/aorms/platform/CreateCompanyForm";
import { JoinCompanyForm } from "../../../components/aorms/platform/JoinCompanyForm";
import { LeaveCompanyButton } from "../../../components/aorms/platform/LeaveCompanyButton";
import { PlatformAuthCta } from "../../../components/aorms/platform/PlatformAuthCta";

const HOURS_TO_PRO = 100;

type CompanyEmbed = { id: string; name: string; public_id: string } | null;

/**
 * My AORMS Identity — the portable personal account (AORMS-U- handle,
 * usage hours, Basic/Pro level) and every company membership, sourced from
 * the separate AORMS Platform Supabase project (see lib/platform/*). This
 * page lives under (app)/ (not the plan's literally-drafted (platform)/
 * route group) so it keeps the app shell/nav like every other admin page —
 * only the *login* boundary (platform-signup/platform-login) is genuinely
 * separate, not this page's own chrome.
 */
export default async function IdentityPage() {
  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const handle = profile?.platform_public_id ?? null;

  if (!handle) {
    // Not linked yet. If this browser tab happens to have an active AORMS
    // Platform session, offer a one-click link with the handle pre-filled;
    // either way, also offer a plain text field + sign-up/sign-in links.
    const platformSupabase = await createPlatformClient();
    const {
      data: { user: platformUser },
    } = await platformSupabase.auth.getUser();

    let knownHandle: string | undefined;
    if (platformUser) {
      const { data: account } = await platformSupabase
        .from("accounts")
        .select("public_id")
        .eq("id", platformUser.id)
        .maybeSingle();
      knownHandle = account?.public_id ?? undefined;
    }

    return (
      <Grid>
        <Column sm={4} md={8} lg={8}>
          <h1 className="cds--type-heading-05">AORMS Identity</h1>
          <p
            className="cds--type-body-01"
            style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
          >
            A portable personal identity — your own AORMS-U- handle, usage hours, and level, independent of any
            one company. Not linked to this login yet.
          </p>
          <Tile>
            <Stack gap={5}>
              {knownHandle ? (
                <p className="cds--type-body-01">
                  You&apos;re signed in to the AORMS Platform as <strong>{knownHandle}</strong>.
                </p>
              ) : (
                <PlatformAuthCta />
              )}
              <LinkIdentityForm knownHandle={knownHandle} />
            </Stack>
          </Tile>
        </Column>
      </Grid>
    );
  }

  // Linked — read the live account + memberships from the platform
  // project via its service-role client. Scoped by the already-verified
  // handle (not client input), so bypassing the platform's own RLS here
  // carries no privilege-escalation risk — this browser tab need not have
  // an active platform session for its own linked identity to be visible.
  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService
    .from("accounts")
    .select("id, public_id, full_name, level, total_active_seconds")
    .eq("public_id", handle)
    .maybeSingle();

  const { data: memberships } = account
    ? await platformService
        .from("memberships")
        .select("id, role, status, companies(id, name, public_id)")
        .eq("account_id", account.id)
        .neq("status", "LEFT")
        .order("created_at", { ascending: true })
    : { data: [] };

  const hours = account ? account.total_active_seconds / 3600 : 0;

  return (
    <Grid>
      <Column sm={4} md={8} lg={12}>
        <h1 className="cds--type-heading-05">AORMS Identity</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Your portable personal identity — carries across every company you work with.
        </p>

        {!account ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Linked handle {handle} no longer resolves on the AORMS Platform.
          </p>
        ) : (
          <Stack gap={6}>
            <Tile>
              <Stack gap={4}>
                <Stack gap={2} orientation="horizontal">
                  <h2 className="cds--type-heading-03">{account.public_id}</h2>
                  <Tag type={account.level === "PRO" ? "green" : "cool-gray"} size="md">
                    {account.level}
                  </Tag>
                </Stack>
                <p className="cds--type-body-01">{account.full_name}</p>
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {hours.toFixed(1)}h of {HOURS_TO_PRO}h logged
                  {account.level === "BASIC" ? ` — ${Math.max(0, HOURS_TO_PRO - hours).toFixed(1)}h to Pro` : ""}
                </p>
              </Stack>
            </Tile>

            <div>
              <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
                Companies
              </h2>
              <Stack gap={4}>
                {(memberships ?? []).map((m) => {
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
                {(memberships ?? []).length === 0 && (
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    Not a member of any company yet.
                  </p>
                )}
              </Stack>
            </div>

            <Stack gap={6} orientation="horizontal">
              <Tile style={{ flex: 1 }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Create a company
                </h3>
                <CreateCompanyForm />
              </Tile>
              <Tile style={{ flex: 1 }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Join a company
                </h3>
                <JoinCompanyForm />
              </Tile>
            </Stack>
          </Stack>
        )}
      </Column>
    </Grid>
  );
}
