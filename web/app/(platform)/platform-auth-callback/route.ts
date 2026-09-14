/**
 * AORMS Platform's own PKCE callback — the platform-side counterpart to
 * `app/auth/callback/route.ts`, which only ever exchanges a code against
 * the Office Hub's (`aorms-web`) Supabase project. The Platform
 * (`aorms-platform`) is a genuinely separate Auth project with its own
 * session cookie (`sb-platform-auth-token`, see lib/platform/server.ts),
 * so it needs its own callback — there was none at all before this
 * (2026-09-14, found missing while investigating "activation link and
 * reset password links not working"; see lib/actions/
 * platform-password-reset.ts's own header comment for the full account).
 *
 * Same fixed-SITE_URL discipline as the Office Hub callback's own fix
 * earlier this day — never derive the redirect origin from
 * `request.url` (reflects Hostinger's internal port, not the public
 * address; that exact bug is what broke every email link in the first
 * place). `SHARED_PREFIXES` in lib/platform/subdomains.ts already lists
 * this path so it resolves identically regardless of which portal
 * subdomain the click happens to land on.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/platform/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/identity";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/platform-login?error=${encodeURIComponent("That link has expired or was already used. Ask an admin to send a new one.")}`,
  );
}
