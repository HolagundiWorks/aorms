"use server";

/**
 * SysDeX account-level admin overrides — SUPER_ADMIN only (split from platform.ts, 2026-10-06).
 * Original design notes: see the history of lib/actions/platform.ts and docs/esti/AORMS-IDENTITY.md.
 */

import { revalidatePath } from "next/cache";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../platform/account";
import { toSafeErrorMessage } from "../security/safe-error";
import { logStaffAction } from "../platform/staff-audit";
import type { AdminActionResult } from "./platform-types";

// ══ SysDeX — account-level admin overrides (2026-09-14 audit) ═════════════
//
// Two real gaps found live while auditing SysDeX: no way to change an
// account's BASIC/PRO level directly (the only path was assignProSeat,
// itself gated behind a studio's own paid seat count — there was no
// admin override for e.g. a support gesture or correcting a stuck
// state), and no way to grant/revoke admin_role at all short of a raw
// SQL statement via direct DB access (migration 0009's own explicit
// "no self-service grant admin UI in this pass" decision — now revised
// by explicit request: "audit and implement the missing links").
//
// Both gated the same way every other SysDeX admin mutation already is:
// requirePlatformAdmin()-equivalent check here, PLUS real RLS
// enforcement server-side (is_platform_admin()) since these go through
// the RLS-scoped client, not service-role — so a caller who somehow
// reached this function without being an admin still can't write.

async function requireSuperAdmin(): Promise<{ error: string } | null> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!isSuperAdmin(account)) return { error: "Super Admin access required." };
  return null;
}


/**
 * Direct BASIC/PRO override — distinct from assignProSeat/revokeProSeat
 * (which move a studio's own paid seat and are what normal usage should
 * go through). This is the "something's stuck, fix it directly" escape
 * hatch a SysDeX admin needs, not a replacement for the seat-based flow.
 *
 * Service-role client, not RLS-scoped — `accounts` has exactly one RLS
 * policy, "accounts: self read" (SELECT only, own row). There's no
 * UPDATE policy on this table at all, so an RLS-scoped update here would
 * silently affect 0 rows with no error (found auditing this, before
 * shipping it — same reason assignProSeat/revokeProSeat above already
 * use the service-role client for this exact table).
 */
export async function adminSetAccountLevel(accountId: string, level: "BASIC" | "PRO"): Promise<AdminActionResult> {
  const gate = await requireSuperAdmin();
  if (gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { error } = await platformService.from("accounts").update({ level }).eq("id", accountId);
  if (error) return { error: toSafeErrorMessage(error) };

  await logStaffAction("account.set_level", { accountId, level });
  revalidatePath("/admin/accounts");
  return {};
}

/**
 * Grants or revokes platform-staff admin status. Writes to
 * `platform_staff` now (2026-09-14, Identity/Admin separation phase 1 —
 * platform migration 0022, see docs/esti/SYSDEX-PORTAL-AUDIT-2026-09-14
 * .md § 5), NOT the legacy `accounts.is_admin`/`admin_role` columns —
 * this is the one write path that needed to move first, since it's the
 * only place admin status is ever *granted*, not just read.
 * `adminRole: null` fully revokes (deletes the row — no "is_admin=false
 * but a stale admin_role left over" state possible when the fact simply
 * doesn't exist, unlike the old two-column shape on `accounts`).
 * Refuses to let a Super Admin revoke their OWN admin status through
 * this action — not a technical limitation, a deliberate guard against
 * a solo admin locking themselves out with no other path back in
 * (migration 0009's own original comment: granting admin status at all
 * otherwise requires direct DB access).
 *
 * Service-role client, not RLS-scoped — `platform_staff` has no
 * insert/update/delete policy for the authenticated role at all
 * (migration 0022's own header comment: writes are app-code + service-
 * role only, by design, mirroring the exact same shape `accounts.
 * is_admin` had before this table existed).
 */
export async function adminSetAccountRole(
  accountId: string,
  adminRole: "SUPER_ADMIN" | "SUPPORT_STAFF" | null,
): Promise<AdminActionResult> {
  const gate = await requireSuperAdmin();
  if (gate) return gate;

  const caller = await getCurrentPlatformSessionAccount();
  if (caller?.id === accountId && adminRole !== "SUPER_ADMIN") {
    return { error: "You can't revoke or downgrade your own admin access." };
  }

  const supabase = createPlatformServiceRoleClient();
  const { error } = adminRole
    ? await supabase.from("platform_staff").upsert({ id: accountId, admin_role: adminRole }, { onConflict: "id" })
    : await supabase.from("platform_staff").delete().eq("id", accountId);
  if (error) return { error: toSafeErrorMessage(error) };

  await logStaffAction("account.set_admin_role", { accountId });
  revalidatePath("/admin/accounts");
  return {};
}
