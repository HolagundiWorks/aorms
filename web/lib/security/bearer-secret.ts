import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time check of an `Authorization: Bearer <secret>` header against a configured
 * secret (2026-10-02 security audit: the cron routes compared with `!==`, which leaks the
 * secret's prefix through response-time differences). False if the secret is unset.
 */
export function bearerMatches(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
