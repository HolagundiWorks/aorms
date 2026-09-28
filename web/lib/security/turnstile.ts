/**
 * Cloudflare Turnstile — manual server-side verification (2026-09-28).
 *
 * Not routed through Supabase Auth's own native `security_captcha_*`
 * config: `platformSignIn()` (lib/actions/platform.ts) tries the
 * Platform project's `signInWithPassword` first, and — only if that
 * fails — falls back to a *second* `signInWithPassword` against the
 * Office Hub (`aorms-web`) project within the same request. Turnstile
 * tokens are single-use at Cloudflare's own siteverify; Supabase's
 * native captcha check would consume the token on the first call and
 * reject the fallback's reuse of the same token with `captcha_failed`
 * (confirmed live) — breaking the "Office-Hub-only password also works
 * on the unified login" bridge every time it's actually needed.
 *
 * Resolution: native Supabase captcha stays enabled on `aorms-platform`
 * only (protects `platformSignIn`'s primary attempt + `platformSignUp`,
 * both single-call, no reuse conflict). `aorms-web`'s own
 * `requestPasswordReset` — a genuinely standalone, single-call flow —
 * is protected by this manual check instead, called directly, with
 * `security_captcha_enabled` left off on that project so the internal
 * fallback path in `platformSignIn` isn't blocked.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false; // fail closed — never silently skip verification
  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
