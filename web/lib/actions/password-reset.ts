"use server";

/**
 * Self-service password reset + the completion half of both recovery and
 * invite-acceptance links (2026-09-14 remediation — confirmed genuinely
 * missing end-to-end: no forgot-password page, no reset-password page,
 * no `/auth/callback` route existed anywhere in the main app before this).
 *
 * Supabase's `@supabase/ssr` client (see lib/supabase/server.ts) uses the
 * PKCE flow for email links — a reset/invite email points at
 * `{SITE_URL}/auth/callback?code=...&next=...`, and the callback route
 * exchanges that code for a real session (sets the auth cookies) before
 * redirecting to `next`. Only once that session exists can
 * `auth.updateUser({ password })` below actually succeed — it operates on
 * "the currently signed-in user," which the callback's code exchange is
 * what makes true.
 */
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { roleHome } from "../auth/role-home";
import { checkRateLimit, rateLimitIdentifier } from "../security/rate-limit";
import { validatePassword } from "../security/password-policy";
import { toSafeErrorMessage } from "../security/safe-error";

export type PasswordActionState = { error: string } | { success: true } | null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";

export async function requestPasswordReset(_prev: PasswordActionState, formData: FormData): Promise<PasswordActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  // Rate-limited per IP+email — a reset-request flood is both a spam
  // vector (unsolicited emails to a real address) and an enumeration
  // probe if timing/response ever differed by account existence.
  const rateLimit = checkRateLimit("requestPasswordReset", `${await rateLimitIdentifier()}:${email.toLowerCase()}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.ok) return { error: `Too many requests — try again in ${rateLimit.retryAfterSeconds}s.` };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Deliberately the same success response whether or not the email
  // exists — resetPasswordForEmail itself doesn't error on an unknown
  // address (Supabase's own anti-enumeration behavior); surfacing a
  // difference here would just reintroduce the leak at this layer.
  if (error) return { error: toSafeErrorMessage(error) };
  return { success: true };
}

export async function updatePassword(_prev: PasswordActionState, formData: FormData): Promise<PasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();

  // If there's no active session at this point, the recovery/invite link
  // was already used, expired, or never went through /auth/callback
  // successfully — surface that plainly rather than a confusing auth
  // error from updateUser itself.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "This link has expired or was already used. Request a new one and try again." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: toSafeErrorMessage(error) };

  // Straight into the app, not back to /login — the callback's own code
  // exchange already established a real session; forcing a second
  // sign-in with the password just typed is friction the user shouldn't
  // need, not a security requirement (matches signIn()'s own
  // redirect(home) pattern in lib/actions/auth.ts).
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  redirect(roleHome(profile?.role) ?? "/login");
}
