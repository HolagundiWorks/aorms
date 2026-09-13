import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { UpgradeLicenceButton } from "../../../components/aorms/platform/UpgradeLicenceButton";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

type StudioEmbed = { id: string; name: string; public_id: string } | null;

function isLicenceActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * AORMS Licence Management — a separate portal from Identity (own page
 * under the same (platform) route group/login boundary), listing the
 * licence for every Studio the linked account belongs to. Studio-scoped
 * only in this pass — Companies/suppliers don't get licence management
 * here, an explicit, disclosed scope boundary (see the Studio/Company
 * split + Material Catalogue plan).
 *
 * Plan/seats/expiry are no longer owner-editable self-serve as of
 * 2026-09-09 — real Razorpay payments landed
 * (platform/supabase/migrations/0010_payments.sql,
 * 0011_licence_payment_gate.sql) and closed that direct-edit RLS policy.
 * The owner now sees an "Upgrade" button (UpgradeLicenceButton, opens
 * Razorpay Checkout) instead of a free-edit form; a platform admin can
 * still override any studio's licence directly from /admin/licences.
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
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader
              title="Licence Management"
              description="Link your AORMS Identity first — licences belong to studios you're a member of."
            />
            <NextLink href="/identity">Go to My AORMS Identity →</NextLink>
          </Column>
        </Grid>
      </>
    );
  }

  const { data: memberships } = await platformService
    .from("studio_memberships")
    .select("role, studios(id, name, public_id)")
    .eq("account_id", account.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  const studioIds = (memberships ?? [])
    .map((m) => {
      const s = (Array.isArray(m.studios) ? m.studios[0] : m.studios) as StudioEmbed;
      return s?.id;
    })
    .filter((id): id is string => !!id);

  const { data: licences } = studioIds.length
    ? await platformService.from("licences").select("studio_id, plan, seats, expires_at").in("studio_id", studioIds)
    : { data: [] };

  // Active member count per studio — Enterprise eligibility (20+, see
  // createLicenceOrder) is shown here, not just enforced server-side.
  const activeMemberCounts = new Map<string, number>();
  if (studioIds.length) {
    const { data: allMemberships } = await platformService
      .from("studio_memberships")
      .select("studio_id")
      .in("studio_id", studioIds)
      .eq("status", "ACTIVE");
    for (const m of allMemberships ?? []) {
      activeMemberCounts.set(m.studio_id, (activeMemberCounts.get(m.studio_id) ?? 0) + 1);
    }
  }

  const { data: planPricingRows } = await platformService.from("plan_pricing").select("plan, base_price_paise").in("plan", ["PRO", "ENTERPRISE"]);
  const studioPricing = {
    proPricePaise: planPricingRows?.find((p) => p.plan === "PRO")?.base_price_paise ?? 0,
    enterprisePricePaise: planPricingRows?.find((p) => p.plan === "ENTERPRISE")?.base_price_paise ?? 0,
  };

  return (
    <>
      <IdentityPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={10}>
        <PageHeader title="Licence Management" description="Plan, seats, and expiry for every studio you belong to." />

        <Stack gap={5}>
          {(memberships ?? []).map((m) => {
            const studio = (Array.isArray(m.studios) ? m.studios[0] : m.studios) as StudioEmbed;
            if (!studio) return null;
            const licence = (licences ?? []).find((l) => l.studio_id === studio.id);
            const isOwner = m.role === "OWNER";
            const active = licence ? isLicenceActive(licence.expires_at) : false;

            return (
              <Tile key={studio.id}>
                <Stack gap={4}>
                  <Stack gap={2} orientation="horizontal">
                    <h2 className="cds--type-heading-02">{studio.name}</h2>
                    <Tag type="cool-gray" size="sm">
                      {studio.public_id}
                    </Tag>
                  </Stack>
                  {licence ? (
                    <>
                      <Stack gap={2} orientation="horizontal">
                        <Tag
                          type={licence.plan === "ENTERPRISE" ? "magenta" : licence.plan === "PRO" ? "purple" : "gray"}
                          size="md"
                        >
                          {licence.plan === "PRO" ? "Pro" : licence.plan === "ENTERPRISE" ? "Enterprise" : licence.plan}
                        </Tag>
                        <Tag type={active ? "green" : "red"} size="md">
                          {active ? "ACTIVE" : "EXPIRED"}
                        </Tag>
                      </Stack>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {licence.seats} PRO seat{licence.seats === 1 ? "" : "s"} included
                        {licence.expires_at ? ` · expires ${new Date(licence.expires_at).toLocaleDateString()}` : " · no expiry"}
                      </p>
                      {isOwner && (
                        <UpgradeLicenceButton
                          studioId={studio.id}
                          studioName={studio.name}
                          activeMemberCount={activeMemberCounts.get(studio.id) ?? 0}
                          pricing={studioPricing}
                        />
                      )}
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
              Not a member of any studio yet — <NextLink href="/identity">create or join one</NextLink>.
            </p>
          )}
        </Stack>
      </Column>
      </Grid>
    </>
  );
}
