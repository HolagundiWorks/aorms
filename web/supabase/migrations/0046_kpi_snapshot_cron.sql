-- KPI snapshot — daily schedule (2026-09-14). Runs once a day at 23:55
-- UTC (05:25 IST the following morning — deliberately late in the IST
-- day so the captured value reflects a nearly-complete day's activity,
-- not a half-finished morning snapshot) via pg_net → app/api/pulse/
-- snapshot-kpis/route.ts. Same pg_cron install migration 0038's
-- pulse-recompute job already uses; this is a second, independent job
-- alongside it and the nightly demo reset.
--
-- Reuses PULSE_RECOMPUTE_SECRET rather than a new secret of its own —
-- see snapshot-kpis/route.ts's own header comment for why: a second
-- unconfigured secret would silently no-op in production exactly like
-- pulse-recompute's own did before its secret was actually set there
-- (migration 0038's own header comment), and there's no real security
-- benefit to a second value over reusing the one already deployed.

select cron.schedule(
  'kpi-snapshot-daily',
  '55 23 * * *',
  $$
  select net.http_post(
    url := 'https://aorms.in/api/pulse/snapshot-kpis',
    headers := jsonb_build_object(
      'Authorization', 'Bearer 7cc0e2d7a03a8977970a60b22f1aa72c447efe84e8755be7502d30d2884d6456',
      'Content-Type', 'application/json'
    )
  );
  $$
);
