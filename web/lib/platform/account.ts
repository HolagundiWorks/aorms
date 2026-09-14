import { createClient as createWebClient } from "../supabase/server";
import { createClient as createPlatformClient } from "./server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "./service";

export type AdminRole = "SUPER_ADMIN" | "SUPPORT_STAFF" | null;

export type CurrentPlatformAccount = {
  id: string;
  public_id: string;
  is_admin: boolean;
  admin_role: AdminRole;
  /** For the portal header's own greeting (PlatformShellHeader.tsx,
   * 2026-09-14) — accounts.full_name (platform/supabase/migrations/
   * 0001_core.sql) already existed but wasn't selected by either query
   * below until this greeting needed it. */
  full_name: string;
};

/** Every /admin/* page except the dashboard and HelpDeX is SUPER_ADMIN-
 * only (2026-09-10, platform/supabase/migrations/0016_admin_role.sql) —
 * Licences/Payments/Pricing/Accounts(password reset)/ConnectDeX-review/
 * Logs. Support staff are scoped to /admin (dashboard) + /admin/helpdesk. */
export function isSuperAdmin(account: CurrentPlatformAccount | null): boolean {
  return account?.admin_role === "SUPER_ADMIN";
}

/**
 * Resolves a platform account's admin_role from `platform_staff`
 * (2026-09-14, Identity/Admin separation — platform migration 0022; the
 * legacy `accounts.is_admin`/`admin_role` fallback this function had
 * during the transition was removed by migration 0023, which drops
 * those columns entirely — see docs/esti/SYSDEX-PORTAL-AUDIT-2026-09-14
 * .md § 5.3 step 5). `platform_staff` is now the only source of truth;
 * no fallback query left to remove before those columns could be
 * dropped without erroring.
 */
async function resolveAdminRole(
  platformService: ReturnType<typeof createPlatformServiceRoleClient>,
  accountId: string,
): Promise<AdminRole> {
  const { data: staff } = await platformService.from("platform_staff").select("admin_role").eq("id", accountId).maybeSingle();
  return staff?.admin_role ? (staff.admin_role as AdminRole) : null;
}

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
    .select("id, public_id, full_name")
    .eq("public_id", profile.platform_public_id)
    .maybeSingle();
  if (!account) return null;

  const admin_role = await resolveAdminRole(platformService, account.id);
  return { ...account, admin_role, is_admin: admin_role !== null };
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
  const { data: account } = await platformService.from("accounts").select("id, public_id, full_name").eq("id", user.id).maybeSingle();
  if (!account) return null;

  const admin_role = await resolveAdminRole(platformService, account.id);
  return { ...account, admin_role, is_admin: admin_role !== null };
}

/** Nav-bar status shared by all three portal headers
 * (PlatformShellHeader.tsx) — signed in (Platform's own session),
 * whether they're any kind of platform staff (for the cross-portal
 * "SysDeX" link), whether they're specifically a SUPER_ADMIN (for which
 * SysDeX nav items to show — support staff only ever see Dashboard +
 * HelpDeX), and their display name for the header's own greeting
 * (2026-09-14 shell remediation — falls back to "there" same as Office
 * Hub's own greeting does for a name-less profile).
 *
 * **2026-09-14, Company/ConnectDeX identity split (platform migration
 * 0024):** falls back to `company_accounts` when the session has no
 * Studio/staff `accounts` row — otherwise a signed-in Company user (a
 * genuinely separate identity now, not a row in `accounts`) would show
 * "Sign in" in every portal header despite having an active session. A
 * Company identity is never admin/super-admin (those flags stay tied to
 * `platform_staff`, layered only on top of an `accounts` row), so this
 * fallback only ever affects `signedIn`/`displayName`.
 */
export async function getPlatformNavStatus(): Promise<{
  signedIn: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  displayName: string;
}> {
  const account = await getCurrentPlatformSessionAccount();
  if (account) {
    return {
      signedIn: true,
      isAdmin: account.is_admin,
      isSuperAdmin: isSuperAdmin(account),
      displayName: account.full_name?.trim() || "there",
    };
  }

  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return { signedIn: false, isAdmin: false, isSuperAdmin: false, displayName: "there" };

  const platformService = createPlatformServiceRoleClient();
  const { data: companyAccount } = await platformService
    .schema("connectdex")
    .from("company_accounts")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    signedIn: !!companyAccount,
    isAdmin: false,
    isSuperAdmin: false,
    displayName: companyAccount?.full_name?.trim() || "there",
  };
}
