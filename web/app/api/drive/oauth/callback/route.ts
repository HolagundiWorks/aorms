import { NextResponse } from "next/server";
import { decodeState, exchangeCodeForTokens, fetchGoogleAccountEmail } from "../../../../../lib/drive/oauth";
import { createClient as createPlatformClient } from "../../../../../lib/platform/server";

/**
 * Google Drive OAuth callback (docs/esti/AORMS-V2-DEVELOPER-GUIDELINES.md
 * § 6). Relocated 2026-09-20 from the Office Hub session to the AORMS
 * Platform session (connector config is studio_id-keyed now, see
 * platform/supabase/migrations/0039_drive_connector.sql) — the browser
 * carries the platform session cookie since the flow only ever starts
 * from a `/studios/[studioId]` page. Uses the signed-in account's own
 * session client (not service-role) so store_drive_connection()'s
 * internal is_studio_owner() check is what actually authorizes the
 * write — same pattern as every other RPC in this codebase, not a
 * special case for OAuth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  let redirectBase = "/identity";
  const fail = (reason: string) => NextResponse.redirect(new URL(`${redirectBase}?drive_error=${encodeURIComponent(reason)}`, url.origin));

  if (error) return fail(error);
  if (!code || !state) return fail("missing_code");

  let parsedState: { studioId: string; accountId: string };
  try {
    parsedState = decodeState(state);
    redirectBase = `/studios/${parsedState.studioId}`;
  } catch {
    return fail("invalid_state");
  }

  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user || user.id !== parsedState.accountId) {
    return fail("session_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // No refresh token means the user already granted consent before
      // and Google didn't re-issue one — buildAuthUrl always sends
      // prompt=consent specifically to avoid this, but a stale/replayed
      // callback could still hit it.
      return fail("no_refresh_token");
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);

    const { error: rpcError } = await platform.rpc("store_drive_connection", {
      p_studio_id: parsedState.studioId,
      p_refresh_token: tokens.refresh_token,
      p_google_account_email: email,
    });
    if (rpcError) return fail(rpcError.message.slice(0, 100));

    return NextResponse.redirect(new URL(`${redirectBase}?drive_connected=true`, url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return fail(message.slice(0, 100));
  }
}
