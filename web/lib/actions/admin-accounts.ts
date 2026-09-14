"use server";

/**
 * SysDeX — platform-account administration (2026-09-10). Admin-triggered
 * password reset: no new email infra, reuses Supabase Auth's own
 * "forgot password" endpoint (`resetPasswordForEmail`), same "Supabase's
 * own email delivery only" convention as `inviteUserByEmail` elsewhere in
 * this codebase (web/lib/actions/portal-invites.ts, lib/actions/
 * connectdex.ts's adminInviteConnectDexApplication). This is an admin
 * triggering the reset on someone else's behalf, not the account owner's
 * own "forgot password" click — resetPasswordForEmail needs no session of
 * its own (it's the public GoTrue recovery endpoint), so the service-role
 * client instance is used purely for convenience (already at hand for the
 * getUserById lookup), not because the call itself is privileged.
 */
import { revalidatePath } from "next/cache";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type AdminAccountActionState = { error: string } | { success: string } | null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";

async function requirePlatformAdmin(): Promise<{ accountId: string } | { error: string }> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!isSuperAdmin(account)) return { error: "Admin access required." };
  return { accountId: account.id };
}

/**
 * Sends the target account a Supabase password-recovery email and records
 * a `password_reset_requests` row (the only thing this action does that a
 * trigger can hang an activity-log entry off of — the actual reset call
 * itself is an Auth API call, not a table write, see the migration's own
 * header comment).
 *
 * `accountKind` (2026-09-14, portal-completion audit) — `password_reset_
 * requests` gained a `company_account_id` column alongside the original
 * `account_id` (platform migration 0027), exactly one of which must be
 * set now: an Identity account's row still goes in `account_id`, a
 * Company account's row goes in `company_account_id` instead — Company
 * Accounts have no row in `accounts` at all post the identity split
 * (migration 0024), so inserting their id into `account_id` would violate
 * that column's FK. `getUserById` itself is unaffected either way (Auth
 * is schema-neutral).
 */
export async function adminTriggerPasswordReset(
  accountId: string,
  accountKind: "identity" | "company" = "identity",
): Promise<AdminAccountActionState> {
  const gate = await requirePlatformAdmin();
  if ("error" in gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { data: userData, error: getUserError } = await platformService.auth.admin.getUserById(accountId);
  if (getUserError || !userData?.user?.email) return { error: "Couldn't find that account's email." };

  // 2026-09-14 — this used to redirect straight to /platform-login with
  // no code-exchange step at all (the platform project's own
  // /auth/callback equivalent didn't exist yet, see
  // lib/actions/platform-password-reset.ts's header comment for the
  // full account of why every one of these emails silently failed to
  // actually let anyone set a new password). Also stopped reading the
  // origin from the request's own Origin header — same "never derive a
  // redirect target from anything request-scoped" discipline as
  // app/auth/callback/route.ts's own fix earlier this day, for a link
  // this sensitive there's no reason to accept any variability at all.
  const { error: resetError } = await platformService.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${SITE_URL}/platform-auth-callback?next=${encodeURIComponent("/platform-reset-password")}`,
  });
  if (resetError) return { error: resetError.message };

  const { error: logError } = await platformService.from("password_reset_requests").insert(
    accountKind === "company"
      ? { company_account_id: accountId, triggered_by_id: gate.accountId, email_sent_to: userData.user.email }
      : { account_id: accountId, triggered_by_id: gate.accountId, email_sent_to: userData.user.email },
  );
  if (logError) return { error: logError.message };

  revalidatePath("/admin/accounts");
  return { success: `Password reset email sent to ${userData.user.email}.` };
}
