import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createWebServiceRoleClient } from "../supabase/service";
import { getActiveFirmId } from "../firm/current";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "./service";

export type FirmStudio = { id: string; name: string; public_id: string; plan: string };

/**
 * Resolves the Platform Studio the *signed-in user's own firm* is linked
 * to (migration 0048 — firms.platform_studio_public_id). Multi-tenant as
 * of migration 0053: `firms` now holds one row per Studio, and RLS scopes
 * this read to `id = current_firm_id()` — so this is a per-session
 * resolution (the caller's own firm), not a deployment-wide one the way it
 * was when `firm` was a Postgres singleton. Returns null if the caller's
 * firm was never linked to a Platform Studio (most deployments won't have
 * this set up — every check using this treats "not linked" as "no cap
 * applies," not an error).
 */
export async function getFirmStudio(): Promise<FirmStudio | null> {
  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  // Scoped explicitly to the caller's ACTIVE firm — see lib/firm/current.ts's
  // header for why an unscoped `.from("firms")` read is broken for any
  // account with 2+ firm memberships (migration 0055's additive "firms:
  // member read own memberships" SELECT policy). This function gates the
  // free-tier client/contractor/project caps (checkPlanCap below), so
  // returning the WRONG firm's studio here would apply the wrong plan's
  // caps — same class of bug as the /firm-settings and invoice-creation
  // ones, just with a cap-enforcement blast radius instead of a
  // read/write one.
  const activeFirmId = await getActiveFirmId(webSupabase, user?.id);
  if (!activeFirmId) return null;
  const { data: firm } = await webSupabase
    .from("firms")
    .select("platform_studio_public_id")
    .eq("id", activeFirmId)
    .maybeSingle();
  const handle = firm?.platform_studio_public_id;
  if (!handle) return null;

  const platformService = createPlatformServiceRoleClient();
  const { data: studio } = await platformService.from("studios").select("id, name, public_id").eq("public_id", handle).maybeSingle();
  if (!studio) return null;

  const { data: licence } = await platformService.from("licences").select("plan").eq("studio_id", studio.id).maybeSingle();

  return { id: studio.id, name: studio.name, public_id: studio.public_id, plan: licence?.plan ?? "FREE" };
}

/**
 * 2026-09-14 — real pricing restructure (see platform migration 0033 and
 * docs/esti/ROADMAP.md's dated entry): per-tier caps on Office-Hub-side
 * record counts. Replaces the old flat "FREE_TIER_RECORD_CAP = 3,
 * TRIAL-only" shape — the tier set grew from TRIAL/PRO/ENTERPRISE to
 * FREE/STUDIO/PROFESSIONAL/ENTERPRISE, and Studio/Professional now have
 * their own real project caps too (previously only clients/contractors
 * were capped, and only on TRIAL). `null` = unlimited. Team-member caps
 * are a separate, Platform-side check (`checkStudioMemberCap` in
 * lib/actions/platform.ts) since they operate on a studio's membership
 * directly, not via this file's Office-Hub-deployment resolution — kept
 * as two functions rather than forced into one shared shape, since they
 * genuinely run in different contexts.
 */
export const PLAN_CAPS: Record<string, { client: number | null; contractor: number | null; project: number | null }> = {
  FREE: { client: 3, contractor: 3, project: 2 },
  STUDIO: { client: null, contractor: null, project: 10 },
  PROFESSIONAL: { client: null, contractor: null, project: null },
  ENTERPRISE: { client: null, contractor: null, project: null },
};

/**
 * B3 fix (2026-09-20 QA) — resolves the Office Hub firm role
 * (`profile_firm_memberships.role`) for a Platform account's membership in
 * a given Studio, when that Studio is linked to an Office Hub firm
 * (`firms.platform_studio_public_id`) and this Platform account is linked
 * to an Office Hub profile (`profiles.platform_public_id`). Used by the
 * Identity Portal (app/(platform)/identity/page.tsx, resume/page.tsx via
 * getWorkHistory()) in place of the Platform-side `studio_memberships.role`
 * alone — that column is only a coarse OWNER (Studio creator, permanent —
 * see createStudio() in lib/actions/platform.ts) / MEMBER (everyone else,
 * no promotion path — see joinStudio()'s own comment there) distinction
 * about who administers the Platform Studio *object*. Migration 0055's own
 * header comment documents this as genuinely different from, and
 * deliberately allowed to diverge from, a person's real Office Hub firm
 * role (OWNER/PARTNER/ASSOCIATE/…, promotable via /users) — "a person can
 * be OWNER of their own studio and, separately, ASSOCIATE... in a firm
 * that invited them." Office Hub's role is the one actually enforced by
 * RLS throughout the app (current_app_role()), so it's the authoritative
 * "what is this person's role at this firm" answer for display purposes;
 * showing the Platform-only tag as if it were that answer is what QA
 * flagged as an inconsistency. Returns null when no linked firm/profile/
 * membership resolves (e.g. a Studio never onboarded to Office Hub) —
 * callers fall back to the Platform-side role in that case.
 */
export async function getFirmRoleForStudio(studioPublicId: string, platformPublicId: string): Promise<string | null> {
  const webService = createWebServiceRoleClient();
  const { data: firm } = await webService.from("firms").select("id").eq("platform_studio_public_id", studioPublicId).maybeSingle();
  if (!firm) return null;

  const { data: profile } = await webService.from("profiles").select("id").eq("platform_public_id", platformPublicId).maybeSingle();
  if (!profile) return null;

  const { data: membership } = await webService
    .from("profile_firm_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("firm_id", firm.id)
    .maybeSingle();
  return membership?.role ?? null;
}

export async function checkPlanCap(
  currentCount: number,
  kind: "client" | "contractor" | "project",
): Promise<{ error: string } | null> {
  const studio = await getFirmStudio();
  if (!studio) return null;

  const cap = PLAN_CAPS[studio.plan]?.[kind];
  if (cap === null || cap === undefined) return null;

  if (currentCount >= cap) {
    const nextTier = studio.plan === "FREE" ? "Studio" : studio.plan === "STUDIO" ? "Professional" : "a higher tier";
    return {
      error: `${studio.name}'s current plan is limited to ${cap} ${kind}s. Upgrade to ${nextTier} on the AORMS Platform to add more.`,
    };
  }
  return null;
}
