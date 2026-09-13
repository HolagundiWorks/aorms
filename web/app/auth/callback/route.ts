/**
 * PKCE callback — the piece that was missing entirely (2026-09-14
 * remediation). Every Supabase email link this app sends (password
 * reset, invite-to-accept) points here with `?code=...&next=...`; this
 * route exchanges the code for a real session (sets the auth cookies),
 * then redirects to `next` — only after that exchange does the target
 * page (e.g. /reset-password) have an authenticated user to act on.
 *
 * A missing/invalid/expired code is a normal case (a stale or reused
 * link), not a server error — redirect to login with a plain message
 * rather than a raw 500.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("That link has expired or was already used. Request a new one and try again.")}`,
  );
}
