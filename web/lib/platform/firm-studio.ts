import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "./service";

export type FirmStudio = { id: string; name: string; public_id: string; plan: string };

/**
 * Resolves the one AORMS Platform Studio this Office Hub deployment is
 * linked to (2026-09-14, migration 0048 — firm.platform_studio_public_id)
 * — null if never linked (the default; every check that uses this treats
 * "not linked" as "no cap applies," not an error, since most deployments
 * won't have this set up at all). `firm` is a singleton, so this is a
 * deployment-wide resolution, not a per-user one — every client/
 * contractor in this deployment already belongs to whichever one studio
 * is linked here, unlike Identity's own per-person
 * profiles.platform_public_id link.
 */
export async function getFirmStudio(): Promise<FirmStudio | null> {
  const webSupabase = await createWebClient();
  const { data: firm } = await webSupabase.from("firm").select("platform_studio_public_id").eq("singleton", true).maybeSingle();
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
