/**
 * AORMS Platform browser client — use in Client Components ("use client").
 * Points at the separate central identity/licensing Supabase project
 * (platform/supabase/), not web/'s own app database. Byte-for-byte the
 * same @supabase/ssr pattern as lib/supabase/client.ts, with one required
 * difference: an explicit `cookieOptions.name`.
 *
 * @supabase/ssr derives its default cookie name from the project URL's
 * host (`sb-<ref>-auth-token`), NOT the full origin — for two local stacks
 * both on `http://127.0.0.1:<port>` (this project and web/'s own), that
 * derives to the identical `sb-127-auth-token` for both, so signing into
 * one silently overwrote the other's session cookie (found live: linking
 * an identity failed with "Not signed in" right after platform signup,
 * because signing into the platform had just clobbered the web/ app's own
 * session). An explicit, distinct name is what actually keeps the two
 * sessions apart locally — the "different project ⇒ different cookie"
 * assumption only holds for *.supabase.co hosts, not 127.0.0.1.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: "sb-platform-auth-token" } },
  );
}
