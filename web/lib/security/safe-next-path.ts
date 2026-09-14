/**
 * 2026-09-14 — enterprise-grade security pass. Both PKCE-callback routes
 * (`app/auth/callback/route.ts`, `app/(platform)/platform-auth-callback/
 * route.ts`) build a redirect target as `` `${SITE_URL}${next}` `` from an
 * unvalidated `?next=` query param. `SITE_URL` being a fixed string prefix
 * already blocks a naive `next=https://evil.com` from producing a valid
 * cross-origin URL via simple concatenation, but nothing rejected a
 * protocol-relative (`//evil.com`) or otherwise malformed value outright —
 * this closes that gap explicitly rather than relying on the
 * concatenation accident.
 */
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  // Must be a single leading "/" (not "//..." or "/\..." — both of which
  // a browser can interpret as protocol-relative), and must not contain
  // "://" anywhere (rules out an absolute URL smuggled in after a valid-
  // looking prefix).
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.includes("://")) {
    return fallback;
  }
  return next;
}
