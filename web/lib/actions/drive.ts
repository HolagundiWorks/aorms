"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createClient } from "../supabase/server";
import { buildAuthUrl, encodeState } from "../drive/oauth";

/**
 * Starts the Google Drive connection flow (docs/esti/AORMS-V2-DEVELOPER-
 * GUIDELINES.md § 6) — a deliberate second step after sign-in, never
 * bundled into Google identity sign-in itself. `state` carries the
 * firm/user to tie back to on the callback without trusting anything the
 * client could tamper with in between (the callback re-derives nothing
 * from client input except this state and the code Google itself issues).
 *
 * Always redirects (never returns) so it can be used directly as a plain
 * `<form action={startDriveConnection}>` — matches signInWithGoogle()'s
 * shape. Failure redirects back to /firm-settings with drive_error,
 * mirroring the OAuth callback route's own error handling.
 */
export async function startDriveConnection(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/firm-settings?drive_error=" + encodeURIComponent("Sign in first."));

  const { data: profile } = await supabase.from("profiles").select("firm_id, role").eq("id", user.id).maybeSingle();
  if (!profile?.firm_id) redirect("/firm-settings?drive_error=" + encodeURIComponent("No firm in context."));

  const state = encodeState({ firmId: profile.firm_id, userId: user.id, nonce: crypto.randomUUID() });
  redirect(buildAuthUrl(state));
}
