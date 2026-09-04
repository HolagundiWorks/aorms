/**
 * Supabase browser client — use in Client Components ("use client").
 * See docs/esti/NEXTJS-SUPABASE-MIGRATION.md § 14 Supabase.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
