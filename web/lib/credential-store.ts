"use client";

/**
 * Browser "save password" prompts (2026-09-15, reported bug: "logins are
 * not detected by browsers so the save password options are not shown").
 *
 * Both login forms in this app (web/app/(auth)/login/page.tsx,
 * web/app/(platform)/platform-login/page.tsx) were checked and are
 * correctly built — a genuine `<form>` (Carbon's `Form` renders a real
 * DOM `<form>` element), proper `name`/`type="email"`/`type="password"`/
 * `autoComplete="email"`/`autoComplete="current-password"` attributes.
 * The markup isn't the bug. The real cause: a React 19 Server Action
 * bound to a form's `action` submits via a background fetch to an RSC
 * endpoint, then (on `redirect()`) a client-side route transition — not
 * a classic full-page form POST. Many browsers' password-manager
 * heuristics are built around detecting that classic POST-then-navigate
 * pattern and don't reliably recognize this one, even with otherwise
 * perfect form markup. This is a known Next.js App Router / Server
 * Action gap, not something fixable by adjusting `autoComplete` values
 * further.
 *
 * Fix: call the Credential Management API explicitly at submit time —
 * exactly what web.dev's own "Sign-in form best practices" guide
 * recommends for any non-traditional submission flow. Fire-and-forget,
 * feature-detected (Chromium-family only; `navigator.credentials.
 * store()`/`PasswordCredential` aren't implemented in Firefox/Safari,
 * which keep relying on their own native form-submit heuristic against
 * the same, already-correct `<form>` — unaffected either way, not worse
 * off). Called on every submit attempt, not gated on a confirmed
 * success: storing an unsuccessful attempt's password is harmless (the
 * browser offers to update or discard it on the next successful
 * sign-in), and there is no reliable client-side "the Server Action
 * succeeded" signal in this codebase's sign-in flow — every success
 * path ends in `redirect()`, which navigates away before a client
 * component could observe a settled "no error" state to key off.
 */
export function offerToSaveCredentials(form: HTMLFormElement): void {
  if (typeof window === "undefined") return;
  const PasswordCredentialCtor = (window as unknown as { PasswordCredential?: new (form: HTMLFormElement) => Credential }).PasswordCredential;
  if (!PasswordCredentialCtor || !navigator.credentials) return;
  try {
    const credential = new PasswordCredentialCtor(form);
    void navigator.credentials.store(credential).catch(() => {});
  } catch {
    // Feature exists but construction failed (e.g. no password field
    // found in the form at submit time) — nothing to do; the native
    // form-submit heuristic every browser also has remains the fallback.
  }
}
