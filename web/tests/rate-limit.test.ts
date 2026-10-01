import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../lib/security/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to max hits then blocks with a retry hint", () => {
    const id = `t-${Math.random()}`;
    const opts = { max: 3, windowMs: 60_000 };
    expect(checkRateLimit("login", id, opts).ok).toBe(true);
    expect(checkRateLimit("login", id, opts).ok).toBe(true);
    expect(checkRateLimit("login", id, opts).ok).toBe(true);
    const blocked = checkRateLimit("login", id, opts);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
  it("keeps separate buckets per action and identifier", () => {
    const opts = { max: 1, windowMs: 60_000 };
    const a = `a-${Math.random()}`;
    expect(checkRateLimit("x", a, opts).ok).toBe(true);
    expect(checkRateLimit("y", a, opts).ok).toBe(true);
    expect(checkRateLimit("x", `b-${Math.random()}`, opts).ok).toBe(true);
    expect(checkRateLimit("x", a, opts).ok).toBe(false);
  });
});

import { checkRateLimitShared } from "../lib/security/rate-limit";

describe("checkRateLimitShared", () => {
  it("falls back to the in-memory limiter when the shared store is unreachable", async () => {
    // No Supabase env in the test process → the RPC path throws → fallback applies.
    const id = `s-${Math.random()}`;
    const opts = { max: 1, windowMs: 60_000 };
    expect((await checkRateLimitShared("fallback", id, opts)).ok).toBe(true);
    expect((await checkRateLimitShared("fallback", id, opts)).ok).toBe(false);
  });
});
