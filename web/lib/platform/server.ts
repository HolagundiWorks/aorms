/**
 * AORMS Platform server client — use in Server Components, Server Actions,
 * and Route Handlers under app/(platform)/. Reads/writes the platform
 * session's own auth cookie. Byte-for-byte the same @supabase/ssr pattern
 * as lib/supabase/server.ts, with two required differences: an explicit
 * `cookieOptions.name` — see lib/platform/client.ts's header comment for
 * why (both local stacks share `127.0.0.1` as host, so @supabase/ssr's
 * default cookie-name derivation collided between the two projects until
 * this was made explicit) — and, in production only, an explicit
 * `cookieOptions.domain` (2026-09-10): the three Platform portals now
 * live on their own subdomains (identity/connectdex/sysdex.aorms.in, see
 * lib/platform/subdomains.ts), and a cookie with no `domain` set is
 * host-only — it wouldn't follow a signed-in visitor from one subdomain
 * to another at all. `.aorms.in` scopes it to all three (and the main
 * domain). Gated on `NODE_ENV === "production"`: local dev's `localhost`
 * can't set a `.aorms.in`-scoped cookie (the browser rejects a Domain
 * attribute that isn't a suffix of the current host), so this stays
 * unset there and local dev keeps today's host-only behavior unchanged.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: "sb-platform-auth-token", domain: cookieDomain },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — safe to ignore, matching
            // lib/supabase/server.ts. (No separate middleware/proxy refresh
            // pass exists for the platform session yet — Supabase Auth's
            // own access/refresh token flow still handles expiry via the
            // Server Action calls that do run with cookie write access.)
          }
        },
      },
    },
  );
}
