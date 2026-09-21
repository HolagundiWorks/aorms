import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createWebServiceRoleClient } from "../../../lib/supabase/service";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { UpgradeLicenceButton } from "../../../components/aorms/platform/UpgradeLicenceButton";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

type StudioEmbed = { id: string; name: string; public_id: string } | null;

/**
 * B2 fix (2026-09-20 QA) — the FREE-plan usage line used to be a bare
 * hardcoded string ("1 team member, 2 active projects, 3 clients, 3
 * contractors") that happened to equal PLAN_CAPS.FREE/STUDIO_MEMBER_CAP.FREE
 * (lib/platform/firm-studio.ts, lib/actions/platform.ts) — i.e. it always
 * showed the *limit*, worded so it read as live usage, identically for
 * every FREE studio regardless of that studio's real data. Real per-studio
 * usage: team members from this studio's own ACTIVE memberships (Platform
 * project), and active projects/clients/contractors from the Office Hub
 * firm this studio is linked to (`firms.platform_studio_public_id` —
 * unique 1:1, migration 0053's own constraint) via a service-role read
 * (this browser tab has no Office Hub session for that firm to scope RLS
 * off of). "Active projects" reuses the exact same definition already
 * used to enforce this cap (lib/actions/projects.ts:
 * `not("status", "in", "(ARCHIVED,COMPLETED)")`) rather than inventing a
 * second one.
 */
async function getStudioUsage(
  studioId: string,
  studioPublicId: string,
  platformService: ReturnType<typeof createPlatformServiceRoleClient>,
): Promise<{ teamMembers: number; activeProjects: number; clients: number; contractors: number } | null> {
  const webService = createWebServiceRoleClient();

  const { data: firm } = await webService.from("firms").select("id").eq("platform_studio_public_id", studioPublicId).maybeSingle();

  const [{ count: teamMembers }, { count: activeProjects }, { count: clients }, { count: contractors }] = await Promise.all([
    platformService.from("studio_memberships").select("id", { count: "exact", head: true }).eq("studio_id", studioId).eq("status", "ACTIVE"),
    firm
      ? webService.from("project_offices").select("id", { count: "exact", head: true }).eq("firm_id", firm.id).not("status", "in", "(ARCHIVED,COMPLETED)")
      : Promise.resolve({ count: 0 }),
    firm ? webService.from("clients").select("id", { count: "exact", head: true }).eq("firm_id", firm.id) : Promise.resolve({ count: 0 }),
    firm ? webService.from("contractors").select("id", { count: "exact", head: true }).eq("firm_id", firm.id) : Promise.resolve({ count: 0 }),
  ]);

  return {
    teamMembers: teamMembers ?? 0,
    activeProjects: activeProjects ?? 0,
    clients: clients ?? 0,
    contractors: contractors ?? 0,
  };
}

function isLicenceActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

const PLAN_TAG: Record<string, { label: string; type: "gray" | "blue" | "purple" | "magenta" }> = {
  FREE: { label: "Free", type: "gray" },
  STUDIO: { label: "Studio", type: "blue" },
  PROFESSIONAL: { label: "Professional", type: "purple" },
  ENTERPRISE: { label: "Enterprise", type: "magenta" },
};

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
 * Razorpay Checkout for Studio/Professional, "Talk to AORMS" for
 * Enterprise) instead of a free-edit form; a platform admin can still
 * override any studio's licence directly from /admin/licences.
 *
 * 2026-09-14 — real pricing restructure (platform migration 0033):
 * TRIAL/PRO/ENTERPRISE renamed to FREE/STUDIO/PROFESSIONAL/ENTERPRISE.
 * FREE no longer expires (a real, permanent tier now, not a 30-day
 * countdown) — `isLicenceActive()` already treats a null `expires_at` as
 * active, so FREE studios simply never show EXPIRED.
 */
/** The user → profile → account resolution chain, genuinely sequential
 * (each step needs the last step's id) — pulled into its own function so
 * it can run in `Promise.all` alongside the plan-pricing lookup below,
 * which depends on none of it. Note: Supabase's query builder is lazy —
 * it only fires its request once awaited/`.then()`'d, so passing the
 * *builder itself* (not a bare variable holding it) into `Promise.all`
 * is what actually makes two queries run concurrently, not just deferring
 * one to be awaited later. */
async function resolveAccount(webSupabase: Awaited<ReturnType<typeof createWebClient>>, platformService: ReturnType<typeof createPlatformServiceRoleClient>) {
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const handle = profile?.platform_public_id ?? null;

  const { data: account } = handle
    ? await platformService.from("accounts").select("id, full_name").eq("public_id", handle).maybeSingle()
    : { data: null };
  return account ? { ...account, email: user?.email ?? "" } : null;
}

export default async function LicencesPage() {
  const webSupabase = await createWebClient();
  const platformService = createPlatformServiceRoleClient();

  // planPricingRows depends on nothing else on this page — run it
  // concurrently with the (genuinely sequential) account-resolution chain
  // rather than fetching it last.
  const [account, { data: planPricingRows }] = await Promise.all([
    resolveAccount(webSupabase, platformService),
    platformService.from("plan_pricing").select("plan, base_price_paise").in("plan", ["STUDIO", "PROFESSIONAL", "ENTERPRISE"]),
  ]);

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
    : { data: [] as { studio_id: string; plan: string; seats: number; expires_at: string | null }[] };

  const studioPricing = {
    studioPricePaise: planPricingRows?.find((p) => p.plan === "STUDIO")?.base_price_paise ?? 0,
    professionalPricePaise: planPricingRows?.find((p) => p.plan === "PROFESSIONAL")?.base_price_paise ?? 0,
    enterpriseStartingAtPaise: planPricingRows?.find((p) => p.plan === "ENTERPRISE")?.base_price_paise ?? 0,
  };

  // B2 fix — only FREE-plan studios show a usage line at all (paid tiers
  // show seats-included instead), so only fetch real usage for those,
  // not every studio this account belongs to.
  const freeStudios = (memberships ?? [])
    .map((m) => (Array.isArray(m.studios) ? m.studios[0] : m.studios) as StudioEmbed)
    .filter((s): s is NonNullable<StudioEmbed> => !!s)
    .filter((s) => (licences ?? []).find((l) => l.studio_id === s.id)?.plan === "FREE");

  const usageByStudioId = new Map(
    await Promise.all(freeStudios.map(async (s) => [s.id, await getStudioUsage(s.id, s.public_id, platformService)] as const)),
  );

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
            const planTag = licence ? (PLAN_TAG[licence.plan] ?? { label: licence.plan, type: "gray" as const }) : null;
            const usage = licence?.plan === "FREE" ? usageByStudioId.get(studio.id) : null;
            const usageLabel = usage
              ? `${usage.teamMembers} team member${usage.teamMembers === 1 ? "" : "s"}, ${usage.activeProjects} active project${usage.activeProjects === 1 ? "" : "s"}, ${usage.clients} client${usage.clients === 1 ? "" : "s"}, ${usage.contractors} contractor${usage.contractors === 1 ? "" : "s"}`
              : "Usage unavailable";

            return (
              <Tile key={studio.id}>
                <Stack gap={4}>
                  <Stack gap={2} orientation="horizontal">
                    <h2 className="cds--type-heading-02">{studio.name}</h2>
                    <Tag type="cool-gray" size="sm">
                      {studio.public_id}
                    </Tag>
                  </Stack>
                  {licence && planTag ? (
                    <>
                      <Stack gap={2} orientation="horizontal">
                        <Tag type={planTag.type} size="md">
                          {planTag.label}
                        </Tag>
                        <Tag type={active ? "green" : "red"} size="md">
                          {active ? "ACTIVE" : "EXPIRED"}
                        </Tag>
                      </Stack>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {licence.plan === "FREE" ? usageLabel : `${licence.seats} PRO seat${licence.seats === 1 ? "" : "s"} included`}
                        {licence.expires_at ? ` · expires ${new Date(licence.expires_at).toLocaleDateString()}` : " · no expiry"}
                      </p>
                      {isOwner && licence.plan !== "ENTERPRISE" && (
                        <UpgradeLicenceButton
                          studioId={studio.id}
                          studioName={studio.name}
                          ownerName={account.full_name || "there"}
                          ownerEmail={account.email}
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
