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
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentPlatformSessionAccount } from "../platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type AdminAccountActionState = { error: string } | { success: string } | null;

async function requirePlatformAdmin(): Promise<{ accountId: string } | { error: string }> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!account.is_admin) return { error: "Admin access required." };
  return { accountId: account.id };
}

/**
 * Sends the target account a Supabase password-recovery email and records
 * a `password_reset_requests` row (the only thing this action does that a
 * trigger can hang an activity-log entry off of — the actual reset call
 * itself is an Auth API call, not a table write, see the migration's own
 * header comment).
 */
export async function adminTriggerPasswordReset(accountId: string): Promise<AdminAccountActionState> {
  const gate = await requirePlatformAdmin();
  if ("error" in gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { data: userData, error: getUserError } = await platformService.auth.admin.getUserById(accountId);
  if (getUserError || !userData?.user?.email) return { error: "Couldn't find that account's email." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";
  const { error: resetError } = await platformService.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${origin}/platform-login`,
  });
  if (resetError) return { error: resetError.message };

  const { error: logError } = await platformService.from("password_reset_requests").insert({
    account_id: accountId,
    triggered_by_id: gate.accountId,
    email_sent_to: userData.user.email,
  });
  if (logError) return { error: logError.message };

  revalidatePath("/admin/accounts");
  return { success: `Password reset email sent to ${userData.user.email}.` };
}
