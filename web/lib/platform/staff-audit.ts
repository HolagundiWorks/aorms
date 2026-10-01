import { getCurrentPlatformSessionAccount } from "./account";
import { createServiceRoleClient } from "./service";

/**
 * Records WHO a platform-staff member acted (2026-10-01 audit). The DB triggers
 * (platform migrations 0012/0042) record *what changed* but not the actor for
 * writes made with the service role, which carry no end-user JWT. Admin Server
 * Actions call this after a successful write; it appends a `STAFF_ACTION` row with
 * the staff account id (`actor_auth_id`, migration 0046). Never throws — a failure
 * to log must not undo or block the admin action itself.
 */
export async function logStaffAction(action: string, target: Record<string, unknown> = {}): Promise<void> {
  try {
    const account = await getCurrentPlatformSessionAccount();
    await createServiceRoleClient().rpc("log_staff_action", { p_actor: account?.id ?? null, p_action: action, p_target: target });
  } catch {
    /* best-effort */
  }
}
