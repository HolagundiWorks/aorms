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
  await supabase.auth.getClaims();

  return response;
}
