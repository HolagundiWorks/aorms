-- 2026-09-14 — KPI trend arrows (shell/identity/KPI spec §21-22, and the
-- user's own explicit choice when asked: real stored history over a
-- decorative/fake indicator). Nothing tracked KPI values over time before
-- this migration, so "up 10% vs last month" had no real number to compute
-- from. One row per (metric_key, captured_on) — a metric's value on a
-- given day — written once daily by a service-role-only route (see
-- app/api/pulse/snapshot-kpis/route.ts), read by any staff member to
-- compute "today vs N days ago" deltas for KpiTile.tsx's new `trend` prop.
--
-- `value` is `numeric`, not `bigint`/`integer`: covers both plain counts
-- (Clients, Blocked tasks) and paise amounts (Ready to Bill) in one column
-- without a second nullable column per metric shape.
create table public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  value numeric not null,
  captured_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (metric_key, captured_on)
);

alter table public.kpi_snapshots enable row level security;

create policy "kpi_snapshots: staff read" on public.kpi_snapshots
  for select using (public.is_office_staff());

-- Deliberately no insert/update policy for regular staff — writes only
-- happen through the service-role snapshot route (bearer-secret gated,
-- same shape as app/api/pulse/recompute/route.ts), same "gateway-only
-- writes" pattern migration 0043's ai_devices table already established.

create index kpi_snapshots_metric_captured_idx on public.kpi_snapshots (metric_key, captured_on desc);
