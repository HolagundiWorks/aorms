import { headers } from "next/headers";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

/**
 * 2026-09-14 — enterprise-grade security pass. No rate limiting existed
 * anywhere in the app before this (confirmed via a full-repo audit): a
 * scripted brute-force against `platformSignIn`/`signIn`/password-reset-
 * request had nothing slowing it down beyond Supabase Auth's own
 * best-effort throttling.
 *
 * Deliberately a single-process, in-memory sliding-window counter — no
 * Redis/Upstash infra exists for this app. This is real protection
 * against casual/scripted brute-forcing from one source, but two honest
 * limitations: it resets on every redeploy, and it wouldn't share state
 * across multiple server instances if this app is ever scaled
 * horizontally on Hostinger. Documented here rather than silently
 * pretended away — upgrade to a shared store if/when that becomes true.
 */

const buckets = new Map<string, number[]>();

// Bound memory: without this, a distributed attacker cycling through
// many fake identifiers/IPs could grow `buckets` unboundedly. Sweeps
// expired entries whenever the map grows past this size.
const MAX_BUCKETS = 5000;

function sweepExpired(now: number, windowMs: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, hits] of buckets) {
    const kept = hits.filter((t) => now - t < windowMs);
    if (kept.length === 0) buckets.delete(key);
    else buckets.set(key, kept);
  }
}

/**
 * Best-effort caller identifier for rate-limiting Server Actions, which
 * have no direct access to the request's socket address. Reads the
 * standard `x-forwarded-for` header Hostinger's reverse proxy sets
 * (same header this app already trusts elsewhere for the internal-port
 * redirect fixes) — falls back to a fixed key if absent, which degrades
 * gracefully to "one shared bucket for every caller with no header" in a
 * dev environment rather than throwing.
 */
export async function rateLimitIdentifier(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Sliding-window check: `action` scopes the bucket (e.g. "platformSignIn"),
 * `identifier` is typically the caller's IP (see `rateLimitIdentifier`)
 * optionally combined with the attempted email, `max` hits are allowed
 * per `windowMs`.
 */
export function checkRateLimit(action: string, identifier: string, opts: { max: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  sweepExpired(now, opts.windowMs);

  const key = `${action}:${identifier}`;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < opts.windowMs);

  if (hits.length >= opts.max) {
    const oldestStillCounted = hits[0]!;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestStillCounted + opts.windowMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true };
}

/**
 * Shared-store variant (2026-10-01 audit R2): counters live in Postgres
 * (`public.rate_limit_hit`, platform migration 0045), so limits survive redeploys
 * and hold across server instances. Fixed window. If the store is unreachable it
 * falls back to the in-memory limiter above rather than failing sign-in closed —
 * a degraded limiter beats locking everyone out.
 */
export async function checkRateLimitShared(
  action: string,
  identifier: string,
  opts: { max: number; windowMs: number },
): Promise<RateLimitResult> {
  try {
    const { data, error } = await createPlatformServiceRoleClient().rpc("rate_limit_hit", {
      p_key: `${action}:${identifier}`,
      p_max: opts.max,
      p_window_seconds: Math.max(1, Math.ceil(opts.windowMs / 1000)),
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) throw new Error(error?.message ?? "empty rate-limit response");
    return row.allowed ? { ok: true } : { ok: false, retryAfterSeconds: Math.max(1, Number(row.retry_after) || 1) };
  } catch {
    return checkRateLimit(action, identifier, opts);
  }
}
