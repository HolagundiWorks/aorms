import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createClient as createPlatformClient } from "../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { LinkIdentityForm } from "../../../components/aorms/platform/LinkIdentityForm";
import { CreateStudioForm } from "../../../components/aorms/platform/CreateStudioForm";
import { JoinStudioForm } from "../../../components/aorms/platform/JoinStudioForm";
import { LeaveStudioButton } from "../../../components/aorms/platform/LeaveStudioButton";
import { PlatformAuthCta } from "../../../components/aorms/platform/PlatformAuthCta";
import { PurchaseIdentityButton } from "../../../components/aorms/platform/PurchaseIdentityButton";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../components/aorms/platform/PortalHeaders";
import { portalUrl } from "../../../lib/platform/subdomains";

// 2026-09-13: PRO is no longer free/automatic at 100 hours — see
// migration 0018's header. It's now something a Studio grants to one of
// its own members (capped at that Studio's paid Pro/Enterprise seat
// count — migration 0019 renamed the single AORMS_FIRM tier into these
// two). 100 hours now gates something else entirely: the one-time ₹199
// "verified identity" purchase below (IDENTITY_VERIFICATION_HOURS_
// REQUIRED in lib/actions/platform-payments.ts — kept as a separate
// constant there since these two 100-hour thresholds are conceptually
// unrelated even though the number happens to match).
const HOURS_FOR_IDENTITY_VERIFICATION = 100;

type StudioEmbed = { id: string; name: string; public_id: string } | null;

/**
 * My AORMS Identity — the portable personal account (AORMS-U- handle,
 * usage hours, Basic/Pro level) and every Studio membership, sourced from
 * the separate AORMS Platform Supabase project (see lib/platform/*). Lives
 * under the (platform) route group — its own portal, genuinely separate
 * from the Office Hub: no AppShell/SideNav, not linked from the Office
 * Hub's nav at all, reached only by its own direct URL (moved here from
 * (app)/identity/ on explicit request — see the AORMS Identity/Licence
 * portal split plan).
 *
 * Studio-only (2026-09-10) — the Identity Portal is now explicitly for
 * architects & Studios; Company (material-supplier) membership moved to
 * its own page, app/(platform)/connectdex/page.tsx, under the ConnectDeX
 * Portal's own branding (see docs/esti/AORMS-PLATFORM-ARCHITECTURE.md §
 * Three portals). Before this date this page also showed Company
 * memberships in a second section — removed here, not merged, since a
 * material supplier has no reason to see (or be shown) Studio-branded
 * chrome and vice versa.
 *
 * **2026-09-14, critical fix — this page's ONLY account-resolution path
 * used to be the Office-Hub-link (`webSupabase` → `profiles.
 * platform_public_id` → `accounts`), found live to be a total dead end
 * for anyone signing in directly at identity.aorms.in (the portal's own,
 * intended entry point — same "found no option to reach studio create/
 * join" report SysDeX and ConnectDeX had already been fixed for on
 * 2026-09-10/14).** Worse than just "less convenient than it should be":
 * in production, `/identity` always resolves to `identity.aorms.in`
 * (proxy.ts's own subdomain redirect), and the Office Hub's own session
 * cookie is host-scoped to plain `aorms.in` (lib/supabase/server.ts sets
 * no explicit cookie domain, unlike the Platform's own
 * `.aorms.in`-scoped one) — so that cookie is **never sent** to the
 * subdomain this page actually renders on. The old primary path was
 * unreachable for every real visitor, every time, not just an edge case:
 * anyone signing in directly here landed on "Not linked to this login
 * yet" with no way forward, regardless of whether they already had
 * Studio memberships.
 *
 * Fixed by resolving the Platform's OWN session first (same pattern
 * `getCurrentPlatformSessionAccount()` already uses for SysDeX/
 * ConnectDeX) — works on any subdomain, no Office Hub relationship
 * required. The Office-Hub-link path is kept as a genuine fallback (it
 * still works in local dev, where there's no subdomain split at all —
 * see proxy.ts's own "production only" gate), not removed, but it no
 * longer blocks the primary flow.
 */
export default async function IdentityPage() {
  const platformService = createPlatformServiceRoleClient();

  const platformSupabase = await createPlatformClient();
  const {
    data: { user: platformUser },
  } = await platformSupabase.auth.getUser();

  let account:
    | { id: string; public_id: string; full_name: string; level: string; total_active_seconds: number }
    | null = null;
  let isCompanyAccountMismatch = false;

  if (platformUser) {
    const { data: sessionAccount } = await platformService
      .from("accounts")
      .select("id, public_id, full_name, level, total_active_seconds")
      .eq("id", platformUser.id)
      .maybeSingle();
    if (sessionAccount) {
      account = sessionAccount;
    } else {
      // A real Platform session, but not an Identity/Studio account —
      // most likely a Company Account (2026-09-14 identity split) or a
      // platform-staff-only login. A distinct message, not a silent
      // "not linked" that implies linking something would fix it.
      isCompanyAccountMismatch = true;
    }
  }

  // Fallback — the Office-Hub-link path (see this function's own header
  // comment for why this is unreachable in production today, kept for
  // local dev and any future architecture change that makes it reachable
  // again).
  let handle: string | null = null;
  let isStaleLink = false;
  if (!account && !isCompanyAccountMismatch) {
    const webSupabase = await createWebClient();
    const {
      data: { user },
    } = await webSupabase.auth.getUser();
    const { data: profile } = await webSupabase
      .from("profiles")
      .select("platform_public_id")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    handle = profile?.platform_public_id ?? null;

    if (handle) {
      const { data: linkedAccount } = await platformService
        .from("accounts")
        .select("id, public_id, full_name, level, total_active_seconds")
        .eq("public_id", handle)
        .maybeSingle();
      if (linkedAccount) account = linkedAccount;
      else isStaleLink = true;
    }
  }

  if (isCompanyAccountMismatch) {
    return (
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader
              title="AORMS Identity"
              description="Signed in to the AORMS Platform, but not with a Studio/Identity account."
            />
            <Tile>
              <Stack gap={4}>
                <p className="cds--type-body-01">
                  This login is a Company (ConnectDeX) account — a separate identity from AORMS-U-, by design. Head to
                  the <NextLink href={portalUrl("connectdex")}>ConnectDeX Portal</NextLink> instead, or sign out and sign in with an
                  AORMS-U- Identity account.
                </p>
              </Stack>
            </Tile>
          </Column>
        </Grid>
      </>
    );
  }

  if (!account) {
    // Neither a direct Platform session nor an Office Hub link resolved
    // an account — offer a one-click link with the handle pre-filled if
    // this browser tab happens to have an active AORMS Platform session
    // (the local-dev case), plus a plain sign-in/sign-up CTA either way.
    let knownHandle: string | undefined;
    if (platformUser) {
      const { data: sessionAccount } = await platformSupabase
        .from("accounts")
        .select("public_id")
        .eq("id", platformUser.id)
        .maybeSingle();
      knownHandle = sessionAccount?.public_id ?? undefined;
    }

    return (
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader
              title="AORMS Identity"
              description={
                <>
                  A portable personal identity — your own AORMS-U- handle, usage hours, and level, independent of any
                  one studio. {isStaleLink ? "Linked handle no longer resolves." : "Not linked to this login yet."}
                </>
              }
            />
            <Tile>
              <Stack gap={5}>
                {isStaleLink && (
                  <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                    Previously linked to <strong>{handle}</strong>, which no longer exists on the AORMS Platform.
                    Link a different (or newly re-created) identity below.
                  </p>
                )}
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
      </>
    );
  }

  // Linked and resolved — read the live memberships from the platform
  // project via its service-role client. Scoped by the already-verified
  // account (not client input), so bypassing the platform's own RLS here
  // carries no privilege-escalation risk — this browser tab need not have
  // an active platform session for its own linked identity to be visible.
  const { data: memberships } = await platformService
    .from("studio_memberships")
    .select("id, role, status, studios(id, name, public_id)")
    .eq("account_id", account.id)
    .neq("status", "LEFT")
    .order("created_at", { ascending: true });

  const { data: identityLicence } = await platformService
    .from("identity_licences")
    .select("plan")
    .eq("account_id", account.id)
    .maybeSingle();
  const { data: identityPricingRow } = await platformService
    .from("plan_pricing")
    .select("base_price_paise")
    .eq("plan", "AORMS_IDENTITY")
    .maybeSingle();
  const identityBasePricePaise = identityPricingRow?.base_price_paise ?? 0;
  // Permanent once purchased — no expiry to check anymore (see migration
  // 0018's header: this was an annually-renewing plan before, corrected
  // to a one-time fee).
  const identityVerified = identityLicence?.plan === "AORMS_IDENTITY";

  const hours = account.total_active_seconds / 3600;

  return (
    <>
      <IdentityPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader
            title="AORMS Identity"
            description="Your portable personal identity — carries across every studio you work with."
            actions={
              <NextLink href="/identity/profile" className="cds--type-body-01">
                My Profile →
              </NextLink>
            }
          />

          <Stack gap={6}>
            <Tile>
              <Stack gap={4}>
                <Stack gap={2} orientation="horizontal">
                  <h2 className="cds--type-heading-02">{account.public_id}</h2>
                  <Tag type={account.level === "PRO" ? "green" : "cool-gray"} size="md">
                    {account.level}
                  </Tag>
                </Stack>
                <p className="cds--type-body-01">{account.full_name}</p>
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {hours.toFixed(1)}h logged
                  {account.level === "BASIC"
                    ? " — PRO is granted by a studio you belong to (from its own paid seats), not automatic."
                    : ""}
                </p>
              </Stack>
            </Tile>

            <Tile>
              <Stack gap={4}>
                <Stack gap={2} orientation="horizontal" style={{ alignItems: "center" }}>
                  <h2 className="cds--type-heading-02">AORMS Identity — verified</h2>
                  <Tag type={identityVerified ? "purple" : "gray"} size="md">
                    {identityVerified ? "Verified" : "Unverified"}
                  </Tag>
                </Stack>
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {identityVerified
                    ? "One-time verification purchased — permanent, nothing more to pay, ever."
                    : hours >= HOURS_FOR_IDENTITY_VERIFICATION
                      ? "You've logged enough hours — a one-time payment permanently verifies your AORMS identity."
                      : `Available once you've logged ${HOURS_FOR_IDENTITY_VERIFICATION} hours — ${hours.toFixed(1)}h so far (${Math.max(0, HOURS_FOR_IDENTITY_VERIFICATION - hours).toFixed(1)}h to go). Free until then, and your handle (${account.public_id}) already works either way.`}
                </p>
                {!identityVerified && (
                  <PurchaseIdentityButton basePricePaise={identityBasePricePaise} eligible={hours >= HOURS_FOR_IDENTITY_VERIFICATION} />
                )}
              </Stack>
            </Tile>

            {(memberships ?? []).length === 0 ? (
              // No studio at all yet (2026-09-14, explicit request: "once
              // the user account is created, user needs to join an
              // existing studio or create one to use the AORMS
              // portal") — a real gate, not a quiet aside at the bottom
              // of the page: everything Studio-related this account
              // could otherwise do (the AORMS Office Hub deployment
              // itself, once a studio actually gates that — see this
              // work's own commit for the scoping decision on that
              // larger, separate piece) depends on belonging to one, so
              // this is presented as the required next step, not an
              // optional card among several.
              <Tile style={{ borderLeft: "0.25rem solid var(--cds-support-info)" }}>
                <Stack gap={4}>
                  <h2 className="cds--type-heading-02">Join or create a studio to continue</h2>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    Your AORMS Identity is portable, but it isn&apos;t attached to any studio yet — join one you already
                    work with, or create your own to get started.
                  </p>
                  <Stack gap={6} orientation="horizontal">
                    <div style={{ flex: 1 }}>
                      <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                        Create a studio
                      </h3>
                      <CreateStudioForm />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                        Join a studio
                      </h3>
                      <JoinStudioForm />
                    </div>
                  </Stack>
                </Stack>
              </Tile>
            ) : (
              <>
                <div>
                  <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                    Studios
                  </h2>
                  <Stack gap={4}>
                    {(memberships ?? []).map((m) => {
                      const studio = (Array.isArray(m.studios) ? m.studios[0] : m.studios) as StudioEmbed;
                      if (!studio) return null;
                      return (
                        <Tile key={m.id}>
                          <Stack gap={3} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <NextLink href={`/studios/${studio.id}`}>
                                <strong>{studio.name}</strong>
                              </NextLink>{" "}
                              <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                                {studio.public_id}
                              </span>
                              <div>
                                <Tag type={m.role === "OWNER" ? "purple" : "gray"} size="sm">
                                  {m.role}
                                </Tag>
                              </div>
                            </div>
                            <LeaveStudioButton membershipId={m.id} studioName={studio.name} />
                          </Stack>
                        </Tile>
                      );
                    })}
                  </Stack>
                </div>

                <Stack gap={6} orientation="horizontal">
                  <Tile style={{ flex: 1 }}>
                    <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                      Create another studio
                    </h3>
                    <CreateStudioForm />
                  </Tile>
                  <Tile style={{ flex: 1 }}>
                    <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                      Join a studio
                    </h3>
                    <JoinStudioForm />
                  </Tile>
                </Stack>
              </>
            )}

            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Supply materials or interior finishes instead? That&apos;s the{" "}
              <NextLink href={portalUrl("connectdex")}>ConnectDeX Portal</NextLink>, not this one.
            </p>
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
