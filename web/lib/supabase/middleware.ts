/**
 * Refreshes the Supabase auth session on every request that hits `middleware.ts`.
 * Required by @supabase/ssr — Server Components can't write cookies, so the
 * session refresh has to happen here.
 *
 * `cookieOptions.domain` (2026-09-20, production only) — matches the same
 * fix in `lib/supabase/server.ts` (see that file's header comment for the
 * full reasoning): a refreshed session cookie written here needs the same
 * `.aorms.in`-wide scope as the one the unified login mints, or a refresh
 * on one subdomain would silently narrow the cookie back to host-only.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_STAMP_COOKIE } from "./session-cap";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching getClaims() is what actually triggers a token refresh when the
  // access token is expired — don't remove this even though the result is
  // unused right now.
  const { data } = await supabase.auth.getClaims();

  // Absolute session cap (2026-09-27, see session-cap.ts's own header for
  // the full incident) — a valid Supabase session whose companion
  // `aorms-session-started` cookie has expired (or never existed, e.g. a
  // session that predates this feature) means the cap has elapsed. Sign
  // out for real here rather than letting getClaims() above keep silently
  // refreshing a 400-day cookie forever.
  if (data?.claims && !request.cookies.get(SESSION_STAMP_COOKIE)) {
    await supabase.auth.signOut();
    // `signOut()` above already queued the cleared auth cookies onto
    // `response` via this client's own `setAll` callback — build the
    // redirect from a copy of those cookies, not a bare `NextResponse
    // .redirect()`, or the browser never actually receives the Set-Cookie
    // clears and the next request looks authenticated again.
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}
