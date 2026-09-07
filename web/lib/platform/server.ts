/**
 * AORMS Platform server client — use in Server Components, Server Actions,
 * and Route Handlers under app/(platform)/. Reads/writes the platform
 * session's own auth cookie. Byte-for-byte the same @supabase/ssr pattern
 * as lib/supabase/server.ts, with one required difference: an explicit
 * `cookieOptions.name` — see lib/platform/client.ts's header comment for
 * why (both local stacks share `127.0.0.1` as host, so @supabase/ssr's
 * default cookie-name derivation collided between the two projects until
 * this was made explicit).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: "sb-platform-auth-token" },
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
