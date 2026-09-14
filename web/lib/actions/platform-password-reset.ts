"use server";

/**
 * AORMS Platform — the completion half of the admin-triggered password
 * reset flow (`adminTriggerPasswordReset`, lib/actions/admin-accounts.ts).
 *
 * **2026-09-14, found missing entirely while investigating "activation
 * link and reset password links not working"**: the Office Hub
 * (`aorms-web`) has had a real PKCE-callback + set-password flow since an
 * earlier same-day remediation (`app/auth/callback/route.ts`,
 * `lib/actions/password-reset.ts`, `app/(auth)/reset-password/page.tsx`)
 * — but the AORMS Platform (`aorms-platform`, a genuinely separate
 * Supabase Auth project/session, see lib/platform/server.ts) never had
 * an equivalent at all. `adminTriggerPasswordReset`'s email link pointed
 * straight at `/platform-login` with nowhere to actually exchange the
 * emailed code for a session or set a new password — the reset email
 * sent, the link opened the sign-in form, and the recipient's password
 * never actually changed. Built the platform-side counterpart, byte-for-
 * byte mirroring the Office Hub's own pattern with the platform's own
 * client/cookie substituted in: `app/platform-auth-callback/route.ts`
 * (code exchange) → this action (the actual `updateUser({password})`
 * call) → `app/(platform)/platform-reset-password/page.tsx` (the form).
 */
import { redirect } from "next/navigation";
import { createClient } from "../platform/server";
import { validatePassword } from "../security/password-policy";
import { toSafeErrorMessage } from "../security/safe-error";

export type PlatformPasswordActionState = { error: string } | null;

export async function updatePlatformPassword(
  _prev: PlatformPasswordActionState,
  formData: FormData,
): Promise<PlatformPasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();

  // If there's no active platform session at this point, the recovery
  // link was already used, expired, or never went through
  // /platform-auth-callback successfully — same "surface it plainly"
  // reasoning as the Office Hub's own updatePassword().
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "This link has expired or was already used. Ask an admin to send a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: toSafeErrorMessage(error) };

  redirect("/identity");
}
