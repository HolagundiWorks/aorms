-- Self-service "edit my own name" — a gap /users' own header comment
-- flagged when it shipped: "profiles: owner manages" only lets OWNER
-- UPDATE any profile (including a user's own), so nobody — OWNER
-- included — had any way to correct their own display name; checked live
-- at the time and there was no RLS policy that would even allow it.
--
-- Deliberately NOT a second bare "profiles: self update" RLS policy
-- (`using (id = auth.uid()) with check (id = auth.uid())`) — that shape
-- already burned this codebase once on `memberships`
-- (platform/supabase/migrations/0005_membership_self_update_guard.sql):
-- a bare using/with-check pair on your OWN row restricts *which row* you
-- can touch, not *which columns* — it would let any signed-in user PATCH
-- their own `role` to OWNER or flip their own `disabled` off in the same
-- request, since RLS has no way to compare old vs new column values on
-- its own. A single-purpose security-definer function that only ever
-- touches `full_name` for the caller's own row sidesteps that whole class
-- of bug by construction — there's no other column for the function body
-- to expose, so no trigger is needed either (contrast the memberships fix,
-- which genuinely needed one because it had to keep a broader UPDATE
-- policy usable for other columns too).

create or replace function public.update_my_full_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if v_name = '' then
    raise exception 'Name cannot be empty';
  end if;
  if length(v_name) > 200 then
    raise exception 'Name is too long (200 characters max)';
  end if;

  update public.profiles set full_name = v_name where id = auth.uid();
end;
$$;

comment on function public.update_my_full_name(text) is
  'Lets any signed-in user correct their own display name — the one column profiles RLS (owner-only UPDATE) never let anyone touch for themselves. Single-purpose security-definer function, not a broader self-update RLS policy, so there is no other column to accidentally leave writable (see the "memberships" self-update-invariant lesson this repo already learned once).';

grant execute on function public.update_my_full_name(text) to authenticated;
