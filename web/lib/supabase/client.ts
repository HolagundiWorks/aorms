/**
 * Supabase browser client — use in Client Components ("use client").
 * See docs/esti/NEXTJS-SUPABASE-MIGRATION.md § 14 Supabase.
 *
 * `cookieOptions.domain` (2026-09-20, production only) — matches the same
 * fix in `lib/supabase/server.ts`, so a client-side read/write of the
 * session cookie (e.g. `signOut()`) stays consistent with the
 * `.aorms.in`-wide scope the server side now uses.
 */
import { createBrowserClient } from "@supabase/ssr";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { domain: cookieDomain } },
  );
}
