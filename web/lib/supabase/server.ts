/**
 * Supabase server client — use in Server Components, Server Actions, and
 * Route Handlers. Reads/writes the auth cookie via Next's `cookies()`.
 * See docs/esti/NEXTJS-SUPABASE-MIGRATION.md § 14 Supabase, § 16 Authentication.
 *
 * `cookieOptions.domain` (2026-09-20, production only) — added when the
 * unified login (identity.aorms.in/platform-login, lib/actions/
 * platform.ts's platformSignIn()) started establishing an Office Hub
 * session from a *different* subdomain than the one that reads it back.
 * A cookie with no `domain` set is host-only — a session minted while the
 * browser is physically on identity.aorms.in would never be sent back to
 * aorms.in at all, which is exactly the bug this fixes (confirmed live:
 * both sessions established correctly after sign-in, but `/pulse` still
 * redirected to login — the session cookie simply never reached
 * aorms.in). `lib/platform/server.ts` already carries this identical fix
 * from 2026-09-10, for the same reason in the other direction — see that
 * file's own header comment. Gated on `NODE_ENV === "production"` for the
 * same reason: local dev's `localhost` can't take a `.aorms.in`-scoped
 * Domain attribute (the browser rejects a Domain that isn't a suffix of
 * the current host), so this stays unset there.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain },
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
            // Called from a Server Component — middleware refreshes the
            // session instead. Safe to ignore here.
          }
        },
      },
    },
  );
}
