-- CRITICAL FIX — found live while testing role editing (2026-09-07): both
-- UPDATE policies on `memberships` (0001_core.sql) have no `with check`
-- clause, so Postgres implicitly reuses each `using` expression to
-- validate the resulting row too. Neither expression constrains which
-- *columns* change, so both were exploitable, confirmed live against a
-- running stack with real accounts (no app UI involved, plain PostgREST
-- PATCH calls with real access tokens):
--
--   1. "memberships: self update (leave)" (`account_id = auth.uid()`) —
--      any member could PATCH their own row to self-promote `role` to
--      'OWNER' while staying ACTIVE, or reassign `company_id` to a
--      company they were NEVER invited to *in the same request*,
--      landing as its uninvited OWNER — a complete takeover of an
--      arbitrary company.
--   2. "memberships: owner update" (`is_company_owner(company_id)`) — a
--      legitimate owner of Company A (trivial to become: anyone can
--      self-serve create a company) could reassign one of Company A's
--      own membership rows' `company_id` to a *completely unrelated*
--      Company B they have no relationship with, landing as its
--      uninvited OWNER too. Confirmed exploitable independently of fix
--      #1 (this path doesn't go through the self-update policy at all).
--
-- A `with check` addition can't fully close either — Postgres RLS only
-- ever sees the candidate NEW row, not an old-vs-new diff, so "these
-- columns must not change" isn't expressible as a bare predicate. Fixed
-- with a `BEFORE UPDATE` trigger instead, which sees both OLD and NEW:
--   - `account_id`/`company_id` are immutable after creation for EVERY
--     caller, including the owner path — a membership always belongs to
--     exactly the person and company it was created for; "moving" one
--     should be a delete+insert (a fresh membership), never an in-place
--     mutation.
--   - The trusted service-role path (this app's own server-side admin/
--     cleanup code, which already bypasses RLS entirely by design
--     everywhere else in this codebase) may still freely change
--     role/status/activated_at/left_at.
--   - A genuine company owner may change role/status for members of
--     their own company (unchanged from the original policy's intent).
--   - Everyone else's update is only accepted if it's a genuine
--     self-leave: `status` becomes `'LEFT'` and `role` is unchanged.
create function public.enforce_membership_update_invariants()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.account_id <> old.account_id or new.company_id <> old.company_id then
    raise exception 'memberships: account_id and company_id cannot be changed after creation';
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_company_owner(old.company_id) then
    return new;
  end if;

  if new.role <> old.role or new.status <> 'LEFT' then
    raise exception 'memberships: self-service updates may only set status to LEFT (leaving) — role cannot be changed by anyone but the company owner';
  end if;

  return new;
end;
$$;

create trigger before_membership_update
  before update on public.memberships
  for each row execute function public.enforce_membership_update_invariants();
