import { NextResponse } from "next/server";
import { decodeState, exchangeCodeForTokens, fetchGoogleAccountEmail } from "../../../../../lib/drive/oauth";
import { createClient } from "../../../../../lib/supabase/server";

/**
 * Google Drive OAuth callback (docs/esti/AORMS-V2-DEVELOPER-GUIDELINES.md
 * § 6). Uses the signed-in user's own session client (not service-role)
 * so store_drive_refresh_token()'s internal has_capability('write') +
 * firm-match check is what actually authorizes the write — same pattern
 * as every other RPC in this codebase, not a special case for OAuth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const fail = (reason: string) => NextResponse.redirect(new URL(`/firm-settings?drive_error=${encodeURIComponent(reason)}`, url.origin));

  if (error) return fail(error);
  if (!code || !state) return fail("missing_code");

  let parsedState: { firmId: string; userId: string };
  try {
    parsedState = decodeState(state);
  } catch {
    return fail("invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== parsedState.userId) {
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

    const { error: rpcError } = await supabase.rpc("store_drive_refresh_token", {
      p_firm_id: parsedState.firmId,
      p_refresh_token: tokens.refresh_token,
      p_google_account_email: email,
    });
    if (rpcError) return fail(rpcError.message.slice(0, 100));

    return NextResponse.redirect(new URL("/firm-settings?drive_connected=true", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return fail(message.slice(0, 100));
  }
}
