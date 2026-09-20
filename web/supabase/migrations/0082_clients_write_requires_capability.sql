-- Fixes a real authorization bug found by live QA (2026-09-20): a VIEWER
-- could create client records. "clients: staff create" (0001_phase2_core,
-- firm-scoped by 0053_firms_multitenant_core) gated INSERT on
-- `is_office_staff()` — which, per its own definition (0001, extended by
-- 0078), returns true for VIEWER too: it answers "can this role see staff
-- data at all", not "can this role write". Every table added from roughly
-- migration 0011 onward correctly uses `has_capability('write')` for its
-- write-side policies instead (rank >= 40 — VIEWER is rank 20, see
-- 0002_capability_helper.sql) — `clients` is one of the original
-- Phase 2 tables (0001) that predates that convention and was never
-- retrofitted onto it.
--
-- Scope note: `project_offices`/`phases`/`tasks` (same 0001 migration) show
-- the identical `is_office_staff()`-for-write gap and are NOT touched here
-- — flagged separately as a follow-up rather than fixed inline, to keep
-- this migration scoped to the one reported bug (creating clients).
--
-- "clients: owner disables" (the UPDATE policy) is untouched — it already
-- gates to `current_app_role() = 'OWNER'`, not `is_office_staff()`, so it
-- was never exposed to this hole.

alter policy "clients: staff create" on public.clients
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
