/**
 * 2026-09-14 — enterprise-grade security pass. Shared password-strength
 * rule so every entry point enforces the same bar. Before this, the
 * ≥8-char check lived duplicated (and inconsistently applied — `updatePassword`/
 * `updatePlatformPassword` had it, `platformSignUp` did not, falling back
 * to Supabase's own project-level 6-char minimum instead) across three
 * separate Server Actions.
 *
 * Kept deliberately mild past the length floor — one letter + one digit,
 * not a full character-class/entropy policy — to avoid rejecting
 * passphrase-style passwords real users pick, which are often stronger
 * than a shorter password satisfying a stricter regex.
 */
export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, error: "Password must contain at least one letter and one number." };
  }
  return { ok: true };
}
