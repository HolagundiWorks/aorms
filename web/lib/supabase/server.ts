/**
 * Supabase server client — use in Server Components, Server Actions, and
 * Route Handlers. Reads/writes the auth cookie via Next's `cookies()`.
 * See docs/esti/NEXTJS-SUPABASE-MIGRATION.md § 14 Supabase, § 16 Authentication.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
