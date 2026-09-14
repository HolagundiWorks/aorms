/**
 * 2026-09-14 — enterprise-grade security pass. Before this, essentially
 * every Server Action across the app (218 occurrences, confirmed via a
 * full-repo audit) did `return { error: error.message }` directly — a raw
 * Postgres/PostgREST error surfaced verbatim to the client, which can
 * include internal table/column/constraint names or confirm an RLS-denial
 * reason an attacker could use to probe the schema.
 *
 * Maps the handful of error shapes that come up constantly (unique/FK/
 * not-null violations, RLS denials) to clean, still-useful text, and
 * falls back to a generic message for anything unrecognized rather than
 * ever forwarding raw internals. Supabase JS error objects carry a
 * Postgres SQLSTATE in `.code` for PostgREST-originated errors.
 */
type MaybePgError = { code?: string; message?: string } | null | undefined;

const KNOWN_CODES: Record<string, string> = {
  "23505": "That value is already in use — please choose a different one.",
  "23503": "This action references something that no longer exists.",
  "23502": "A required field is missing.",
  "42501": "You don't have permission to do that.",
};

export function toSafeErrorMessage(error: MaybePgError): string {
  if (error?.code && KNOWN_CODES[error.code]) return KNOWN_CODES[error.code]!;
  // Auth errors (wrong password, invalid email, rate-limited by Supabase
  // itself, etc.) come from @supabase/supabase-js's GoTrue client, not
  // PostgREST — they carry no `.code` in KNOWN_CODES' shape but their
  // `.message` text is already written to be shown to end users (Supabase
  // designs these messages for that), unlike a raw Postgres error. Pass
  // those through rather than genericizing a message that's already safe
  // and useful ("Invalid login credentials", "Password should be at
  // least..."). Heuristic: no `.code` at all, or a short human-readable
  // message with no SQL-error vocabulary, is treated as already-safe.
  const message = error?.message ?? "";
  const looksLikeRawSqlError = /violates|constraint|relation "|column "|duplicate key|permission denied for/i.test(message);
  if (message && !looksLikeRawSqlError) return message;

  return "Something went wrong — please try again.";
}
