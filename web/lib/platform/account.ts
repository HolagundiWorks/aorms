import { createClient as createWebClient } from "../supabase/server";
import { createClient as createPlatformClient } from "./server";
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

/**
 * Resolves the AORMS Platform account via the Platform's OWN session
 * (`sb-platform-auth-token`) — no AORMS Office Hub account or linked
 * identity required. This is the correct resolver for SysDeX (platform
 * admin) gating: an admin is platform staff, not necessarily a member of
 * any one Office Hub deployment (`aorms-web` is one tenant among many —
 * see AORMS-PLATFORM-ARCHITECTURE.md's tenancy row), so requiring an
 * Office Hub link for admin access (what every admin gate did before
 * 2026-09-10, via getCurrentPlatformAccount above) was a real
 * inconsistency, not a deliberate design choice — fixed once a genuine
 * SysDeX admin-login story was needed. getCurrentPlatformAccount()
 * itself is untouched: it still exists specifically to let a person view
 * /identity read-only from their Office Hub session alone, a distinct
 * and still-valid use case.
 */
export async function getCurrentPlatformSessionAccount(): Promise<CurrentPlatformAccount | null> {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return null;

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService.from("accounts").select("id, public_id, is_admin").eq("id", user.id).maybeSingle();

  return account ?? null;
}

/** Nav-bar status shared by all three portal headers (PortalHeaders.tsx) —
 * signed in (Platform's own session) and, if so, whether they're a
 * platform admin (for the cross-portal "SysDeX" link). */
export async function getPlatformNavStatus(): Promise<{ signedIn: boolean; isAdmin: boolean }> {
  const account = await getCurrentPlatformSessionAccount();
  return { signedIn: !!account, isAdmin: !!account?.is_admin };
}
