"use server";

/**
 * AORMS Platform — usage heartbeat (split from platform.ts, 2026-10-06).
 * Original design notes: see the history of lib/actions/platform.ts and docs/esti/AORMS-IDENTITY.md.
 */

import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { toSafeErrorMessage } from "../security/safe-error";


// ── Usage heartbeat ──────────────────────────────────────────────────────

/**
 * No-ops (returns {ok:false} silently, not an error) when the current web/
 * user hasn't linked a platform identity yet — hours only ever accrue
 * after a one-time link, matching the AORMS Platform plan's "link, don't
 * merge" design. Runs entirely server-side via the platform's service-role
 * client, so it works with no platform session cookie present in this
 * browser tab. `seconds` is clamped to the same [1,120] range the
 * usage_heartbeats CHECK constraint enforces, so a misbehaving client
 * can't claim an outsized beat.
 */
export async function recordHeartbeat(seconds: number = 60): Promise<{ ok: boolean; error?: string }> {
  const clamped = Math.max(1, Math.min(120, Math.round(seconds)));

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.platform_public_id) return { ok: false };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("id")
    .eq("public_id", profile.platform_public_id)
    .maybeSingle();
  if (lookupError || !account) return { ok: false, error: lookupError?.message };

  const { error } = await platformService
    .from("usage_heartbeats")
    .insert({ account_id: account.id, seconds: clamped });
  if (error) return { ok: false, error: toSafeErrorMessage(error) };

  return { ok: true };
}
