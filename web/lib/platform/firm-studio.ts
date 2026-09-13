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

  return { id: studio.id, name: studio.name, public_id: studio.public_id, plan: licence?.plan ?? "TRIAL" };
}

/**
 * Free-tier (TRIAL plan) cap for a firm-scoped count (2026-09-14,
 * explicit request: "free studio account will host 3 users, 3 clients,
 * and 3 contractors only"). Returns null (no cap) when this deployment
 * isn't linked to any studio at all, or the linked studio is on a paid
 * plan — never fabricates a limit against data that isn't actually
 * studio-scoped.
 */
export const FREE_TIER_RECORD_CAP = 3;

export async function checkFreeTierRecordCap(
  currentCount: number,
  kind: "client" | "contractor",
): Promise<{ error: string } | null> {
  const studio = await getFirmStudio();
  if (!studio || studio.plan !== "TRIAL") return null;

  if (currentCount >= FREE_TIER_RECORD_CAP) {
    return {
      error: `Free studio accounts (${studio.name}) are limited to ${FREE_TIER_RECORD_CAP} ${kind}s. Upgrade to Pro or Enterprise on the AORMS Platform to add more.`,
    };
  }
  return null;
}
