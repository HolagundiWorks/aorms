"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createClient as createPlatformClient } from "../platform/server";
import { buildAuthUrl, encodeState } from "../drive/oauth";

/**
 * Starts the Google Drive connection flow (docs/esti/AORMS-V2-DEVELOPER-
 * GUIDELINES.md § 6) — a deliberate second step after sign-in, never
 * bundled into Google identity sign-in itself. Runs in the AORMS Platform
 * context (relocated 2026-09-20 from the Office Hub, firm_id-keyed, per
 * explicit correction: connector config belongs on the identity platform,
 * studio_id-keyed) — called from a `/studios/[studioId]` form, so
 * `studioId` is already known and trusted the same way every other
 * owner-gated action on that page is, not re-derived from a session.
 *
 * `state` carries the studio/account to tie back to on the callback
 * without trusting anything the client could tamper with in between (the
 * callback re-derives nothing from client input except this state and the
 * code Google itself issues). Always redirects (never returns) so it can
 * be used directly as a plain `<form action={startDriveConnection}>`,
 * bound to a specific studioId via `.bind(null, studioId)`.
 */
export async function startDriveConnection(studioId: string): Promise<never> {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) redirect(`/studios/${studioId}?drive_error=` + encodeURIComponent("Sign in first."));

  const { data: membership } = await platform
    .from("studio_memberships")
    .select("id")
    .eq("studio_id", studioId)
    .eq("account_id", user.id)
    .eq("role", "OWNER")
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!membership) redirect(`/studios/${studioId}?drive_error=` + encodeURIComponent("Only the Studio owner can connect Google Drive."));

  const state = encodeState({ studioId, accountId: user.id, nonce: crypto.randomUUID() });
  redirect(buildAuthUrl(state));
}
