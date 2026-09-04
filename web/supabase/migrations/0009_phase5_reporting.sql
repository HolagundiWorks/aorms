-- Phase 5 — Reporting: Dashboard, Reports, Audit log viewer, Workload,
-- ASPRF/Performance. Per docs/esti/NEXTJS-MIGRATION-PHASE5-AUDIT.md, this
-- domain is almost entirely READ MODELS over tables that already exist
-- (invoices from Phase 3; project_offices/phases/tasks/audit_log/profiles
-- from Phase 2) — there is very little new DDL here, unlike Phases 3-4.
--
-- Additions: `profiles` gains dashboard_layout/wellbeing_opt_in (Dashboard +
-- ASPRF, bundled per the audit's own suggestion) and the calendar feed
-- token pair (Workload's unauthenticated .ics subscription route).
--
-- Deliberately NOT ported: an `attendance` table for ASPRF's reliability
-- KPI. The current `esti_attendance` is keyed on `team_member_id`, not
-- `profiles.id` — i.e. it depends on the `teamMembers` table, which does
-- not exist in this schema. That is exactly the open "teamMembers vs
-- profiles" architecture question the Phase 2 audit deferred and the
-- Phase 8 audit reopens as blocking (tasks.assignee_id already points
-- straight at profiles, contradicting HR's separate teamMembers table).
-- Porting attendance now would mean silently picking a side of that
-- decision — flagged, not resolved, per every prior phase's own pattern.
-- ASPRF's reliability KPI stays unimplementable in the new stack until
-- that decision is made; teamScores/myScore work for the other five KPIs.
--
-- Also NOT ported: an RLS policy change in response to the two gaps this
-- audit surfaced (dashboard financial-data exposure via a bare
-- protectedProcedure vs. Phase 3's deliberate invoice:manage tightening;
-- the audit-log viewer's owner-only gate vs. audit_log's staff-wide table
-- RLS from Phase 2) — both are product decisions the audit explicitly says
-- to make on purpose, not migration questions. Worth noting: in the new
-- model, any dashboard read implemented as a plain (non-SECURITY DEFINER)
-- query already inherits invoices' existing invoice:manage RLS correctly —
-- the gap only reappears if a future Postgres function wrapping the
-- aggregate is marked SECURITY DEFINER. Keep it SECURITY INVOKER (the
-- default) when that function gets built.

alter table public.profiles
  add column dashboard_layout jsonb,
  add column wellbeing_opt_in boolean not null default false,
  add column calendar_feed_token text unique,
  add column calendar_feed_token_at timestamptz;

comment on column public.profiles.wellbeing_opt_in is
  'Per-CLAUDE.md ASPRF conventions: Wellbeing (5% weight) is opt-in only, unlike the other five KPIs.';
comment on column public.profiles.calendar_feed_token is
  'Secret, rotatable token for the unauthenticated .ics workload subscription route. 90-day TTL enforced in application code (CALENDAR_FEED_TOKEN_TTL_DAYS), not here — matches the current backend exactly.';
