/**
 * Absolute session lifetime cap (2026-09-27, explicit user request:
 * "auto logoff not working, session gets saved and opening the webpages
 * directly gets into portal"). Root cause: `IdleSessionGuard`
 * (components/aorms/security/IdleSessionGuard.tsx) only signs out an idle
 * tab that's still open — it never touches the underlying Supabase session
 * cookie, which `@supabase/ssr` mints with a 400-day `maxAge` by default
 * (its own `DEFAULT_COOKIE_OPTIONS`, never overridden anywhere in this
 * codebase) regardless of activity or closing the browser. Confirmed live:
 * closing the browser entirely and reopening later landed straight back in
 * the portal, no re-login prompt.
 *
 * This is a companion cookie, not a change to the Supabase session cookie
 * itself (that stays 400 days, unrelated to sign-in state elsewhere e.g.
 * mobile). Stamped once at sign-in with `maxAge` equal to the cap, so the
 * *browser* expires it automatically after that duration — no cron, no
 * server-side session table to query on every request. `middleware.ts`
 * then treats "there's a valid Supabase session but this cookie is gone"
 * as "the absolute cap has elapsed" and forces a real sign-out instead of
 * silently refreshing forever.
 */
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_CAP_SECONDS = 24 * 60 * 60; // 24 hours — adjust here if a different cap is wanted
export const SESSION_STAMP_COOKIE = "aorms-session-started";

const cookieDomain = process.env.NODE_ENV === "production" ? ".aorms.in" : undefined;

const stampCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  domain: cookieDomain,
  maxAge: SESSION_CAP_SECONDS,
};

/** Server Actions only — `cookies()` from `next/headers` merges into the
 * response Next.js itself manages around a `redirect()` throw. */
export async function stampSessionStart() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_STAMP_COOKIE, String(Date.now()), stampCookieOptions);
}

export async function clearSessionStart() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_STAMP_COOKIE, path: "/", domain: cookieDomain });
}

/** Route Handlers that construct and return their own `NextResponse`
 * (e.g. `NextResponse.redirect(...)`) — `next/headers`'s `cookies().set()`
 * isn't guaranteed to attach to a response object the route builds itself,
 * so set the cookie directly on it instead. Same options, same cookie. */
export function stampSessionStartOnResponse(response: NextResponse) {
  response.cookies.set(SESSION_STAMP_COOKIE, String(Date.now()), stampCookieOptions);
}
