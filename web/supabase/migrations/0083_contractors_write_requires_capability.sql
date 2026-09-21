-- Fixes the same authorization bug 0082 fixed for `clients`, found while
-- auditing sibling tables during that fix's own follow-up (2026-09-21):
-- "contractors: staff write" (migration 0012, re-scoped by 0059) gates
-- INSERT/UPDATE/DELETE on `is_office_staff()`, which — per its own
-- definition (0001, extended by 0078) — returns true for VIEWER too. A
-- VIEWER can therefore create/edit/delete contractor records, the same
-- privilege-escalation shape 0082 closed for clients.
--
-- Confirmed exploitable directly against this policy's own WITH CHECK
-- expression (not assumed): `is_office_staff()` was independently
-- verified to include VIEWER in its role list.
--
-- Scope note, same discipline as 0082: `project_offices`/`phases`/`tasks`
-- (and any other pre-migration-0011 table using this same is_office_staff()-
-- for-write pattern) are NOT touched here — flagged separately as a
-- broader sweep needing its own review, not fixed inline.
--
-- "contractors: own portal read" (SELECT-only, no WITH CHECK) is untouched
-- — it already gates to the CONTRACTOR portal role's own row, unrelated to
-- this hole.

alter policy "contractors: staff write" on public.contractors
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
