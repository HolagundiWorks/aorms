-- ESTI Pulse — schedule the recompute pass (2026-09-12). Runs every 15
-- minutes via pg_net → app/api/pulse/recompute/route.ts, the same
-- bearer-secret-gated route lib/actions/pulse.ts's recomputeNow Server
-- Action calls on demand. pg_cron is already installed (one existing
-- job, the nightly demo reset — see CLAUDE.md's dev/verify loop entry);
-- this adds a second, independent job alongside it.
--
-- The bearer value below MUST exactly match the PULSE_RECOMPUTE_SECRET
-- environment variable set on the deployed app (Hostinger → this app →
-- Environment variables) — Postgres has no way to read that env var
-- itself, so the literal value is baked into this migration instead,
-- the same tradeoff Razorpay's own webhook secret makes. This specific
-- value was generated fresh for this migration
-- (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
-- — it is NOT the same value as the one in web/.env.local (that one is
-- dev-only, for calling the route directly from a local `curl`/Server
-- Action without a live cron job). Until PULSE_RECOMPUTE_SECRET is set
-- to this exact value in production, this job's calls will get a 401
-- (harmless — recompute just doesn't run on schedule yet; recomputeNow's
-- on-demand path is unaffected since it doesn't go through this route).

select cron.schedule(
  'pulse-recompute',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://aorms.in/api/pulse/recompute',
    headers := jsonb_build_object(
      'Authorization', 'Bearer 7cc0e2d7a03a8977970a60b22f1aa72c447efe84e8755be7502d30d2884d6456',
      'Content-Type', 'application/json'
    )
  );
  $$
);
