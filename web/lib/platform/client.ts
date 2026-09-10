/**
 * AORMS Platform browser client — use in Client Components ("use client").
 * Points at the separate central identity/licensing Supabase project
 * (platform/supabase/), not web/'s own app database. Byte-for-byte the
 * same @supabase/ssr pattern as lib/supabase/client.ts, with two required
 * differences: an explicit `cookieOptions.name`, and (production only)
 * an explicit `cookieOptions.domain`.
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
 *
 * `cookieOptions.domain` (2026-09-10, production only) — see
 * lib/platform/server.ts's header comment; `.aorms.in` is what lets a
 * Platform sign-in follow a visitor across identity/connectdex/
 * sysdex.aorms.in instead of being host-only to whichever subdomain they
 * signed in from. Gated on NODE_ENV so localhost (which can't set a
 * `.aorms.in`-scoped cookie at all) keeps today's behavior.
 */
import { createBrowserClient } from "@supabase/ssr";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: "sb-platform-auth-token", domain: cookieDomain } },
  );
}
