"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile (2026-09-28) — Supabase Auth's own native CAPTCHA
 * support (`security_captcha_provider: "turnstile"`, configured via the
 * Management API, not in this repo) verifies the token server-side; this
 * component only needs to load Turnstile's script once per page and
 * render the widget div. The resulting `cf-turnstile-response` field is
 * auto-injected into the surrounding <Form> by Turnstile's own script —
 * each Server Action reads it via `formData.get("cf-turnstile-response")`
 * and passes it as `options.captchaToken` on the matching
 * signInWithPassword/signUp/resetPasswordForEmail call.
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a site key — public by design
 * (embedded in every page that renders this), unlike the secret key
 * (server-only, Supabase's own config, never present in this codebase).
 */
export function TurnstileWidget({ action }: { action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-action={action} />
    </>
  );
}
