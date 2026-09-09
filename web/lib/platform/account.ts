import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "./service";

export type CurrentPlatformAccount = {
  id: string;
  public_id: string;
  is_admin: boolean;
};

/**
 * Resolves the AORMS Platform account linked to the current web/ session,
 * if any — the same "profile.platform_public_id -> platform accounts
 * lookup" two-step every platform-touching Server Action/page has needed
 * so far (previously duplicated in licences/page.tsx and
 * lib/actions/platform.ts's recordHeartbeat; extracted here once the admin
 * back office needed the same lookup in half a dozen more places).
 * Returns null, never throws, when there's no web session or no linked
 * identity yet — callers decide what "not linked" means for them (a
 * prompt to link, a notFound(), etc.), matching how licences/page.tsx
 * already handles it.
 */
export async function getCurrentPlatformAccount(): Promise<CurrentPlatformAccount | null> {
  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.platform_public_id) return null;

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService
    .from("accounts")
    .select("id, public_id, is_admin")
    .eq("public_id", profile.platform_public_id)
    .maybeSingle();

  return account ?? null;
}
