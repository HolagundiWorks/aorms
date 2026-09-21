-- Fixes the same authorization bug 0082 (clients) and 0083 (contractors)
-- fixed, found by live QA against production aorms.in (2026-09-21):
-- "project_offices: staff create" and "project_offices: staff update"
-- (migration 0001_phase2_core, firm-scoped by 0053_firms_multitenant_core)
-- gate INSERT/UPDATE on `is_office_staff()` — which, per its own
-- definition (0001, extended by 0078), returns true for VIEWER too: it
-- answers "can this role see staff data at all", not "can this role
-- write". This is exactly the gap 0082/0083's own header comments flagged
-- as a known, tracked follow-up ("project_offices/phases/tasks... NOT
-- touched here") rather than a new discovery.
--
-- Confirmed exploitable live (2026-09-21): signed in as a VIEWER-role
-- test account on a real firm, the Projects list page (`/projects`)
-- rendered a working "Create project" button — no UI gate at all, and
-- the underlying Server Action (`createProjectRecord`,
-- web/lib/actions/projects.ts) had no server-side role check either, so
-- the INSERT reached this RLS policy and succeeded purely because
-- `is_office_staff()` includes VIEWER.
--
-- Scope note, same discipline as 0082/0083: `phases` and `tasks` (the two
-- other tables 0082/0083 flagged alongside `project_offices` as sharing
-- this exact `is_office_staff()`-for-write pattern) are NOT touched here —
-- this migration is scoped to the one reported bug (creating/editing
-- project offices from the Projects list page). Still flagged separately
-- for the same broader sweep those two migrations already called for.
--
-- "project_offices: staff read", "project_offices: own portal read", and
-- "project_offices: consultant portal read" (all SELECT-only) are
-- untouched — this hole is specific to the write-side policies.
-- `project_offices` has no DELETE policy at all (never did, since 0001),
-- so there is no delete-side gap to close here.

alter policy "project_offices: staff create" on public.project_offices
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "project_offices: staff update" on public.project_offices
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
