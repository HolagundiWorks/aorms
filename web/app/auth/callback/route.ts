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
 *
 * **2026-09-14, critical fix — do not derive the redirect origin from
 * `request.url`.** Same bug class as proxy.ts's own fix earlier this
 * day: `new URL(request.url).origin` reflects Hostinger's *internal*
 * address the reverse proxy forwards requests to (port 3000), not the
 * public `https://aorms.in` the email link actually points at. Every
 * activation and password-reset email sent by this app was landing the
 * click correctly on `/auth/callback` (that part of the link is built
 * from the hardcoded SITE_URL constant, in password-reset.ts/
 * portal-invites.ts), successfully exchanging the code for a session —
 * then redirecting to an unreachable internal URL for the final hop,
 * which is exactly the failure the user reported ("activation link and
 * reset password links not working"). Fixed the same way as proxy.ts:
 * never read the origin back off the request at all, use the same fixed
 * public SITE_URL every other link-building call site already does.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/pulse";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/login?error=${encodeURIComponent("That link has expired or was already used. Request a new one and try again.")}`,
  );
}
