import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { UpdateLicenceForm } from "../../../components/aorms/platform/UpdateLicenceForm";

type CompanyEmbed = { id: string; name: string; public_id: string } | null;

function isLicenceActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * AORMS Licence Management — a separate portal from Identity (own page
 * under the same (platform) route group/login boundary), listing the
 * licence for every company the linked account belongs to. Plan/seats/
 * expiry are owner-editable self-serve — no billing/payment integration
 * exists in this stack (see platform/supabase/migrations/0004_licences.sql).
 */
export default async function LicencesPage() {
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

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = handle
    ? await platformService.from("accounts").select("id").eq("public_id", handle).maybeSingle()
    : { data: null };

  if (!account) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={8}>
          <h1 className="cds--type-heading-05">Licence Management</h1>
          <p
            className="cds--type-body-01"
            style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
          >
            Link your AORMS Identity first — licences belong to companies you&apos;re a member of.
          </p>
          <NextLink href="/identity">Go to My AORMS Identity →</NextLink>
        </Column>
      </Grid>
    );
  }

  const { data: memberships } = await platformService
    .from("memberships")
    .select("role, companies(id, name, public_id)")
    .eq("account_id", account.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  const companyIds = (memberships ?? [])
    .map((m) => {
      const c = (Array.isArray(m.companies) ? m.companies[0] : m.companies) as CompanyEmbed;
      return c?.id;
    })
    .filter((id): id is string => !!id);

  const { data: licences } = companyIds.length
    ? await platformService.from("licences").select("company_id, plan, seats, expires_at").in("company_id", companyIds)
    : { data: [] };

  return (
    <Grid>
      <Column sm={4} md={8} lg={10}>
        <h1 className="cds--type-heading-05">Licence Management</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Plan, seats, and expiry for every company you belong to.
        </p>

        <Stack gap={5}>
          {(memberships ?? []).map((m) => {
            const company = (Array.isArray(m.companies) ? m.companies[0] : m.companies) as CompanyEmbed;
            if (!company) return null;
            const licence = (licences ?? []).find((l) => l.company_id === company.id);
            const isOwner = m.role === "OWNER";
            const active = licence ? isLicenceActive(licence.expires_at) : false;

            return (
              <Tile key={company.id}>
                <Stack gap={4}>
                  <Stack gap={2} orientation="horizontal">
                    <h2 className="cds--type-heading-03">{company.name}</h2>
                    <Tag type="cool-gray" size="sm">
                      {company.public_id}
                    </Tag>
                  </Stack>
                  {licence ? (
                    <>
                      <Stack gap={2} orientation="horizontal">
                        <Tag type={licence.plan === "PREMIUM" ? "purple" : licence.plan === "STANDARD" ? "blue" : "gray"} size="md">
                          {licence.plan}
                        </Tag>
                        <Tag type={active ? "green" : "red"} size="md">
                          {active ? "ACTIVE" : "EXPIRED"}
                        </Tag>
                      </Stack>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {licence.seats} seat{licence.seats === 1 ? "" : "s"}
                        {licence.expires_at ? ` · expires ${new Date(licence.expires_at).toLocaleDateString()}` : " · no expiry"}
                      </p>
                      {isOwner && <UpdateLicenceForm companyId={company.id} licence={licence} />}
                    </>
                  ) : (
                    <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                      No licence record found.
                    </p>
                  )}
                </Stack>
              </Tile>
            );
          })}
          {(memberships ?? []).length === 0 && (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Not a member of any company yet — <NextLink href="/identity">create or join one</NextLink>.
            </p>
          )}
        </Stack>
      </Column>
    </Grid>
  );
}
