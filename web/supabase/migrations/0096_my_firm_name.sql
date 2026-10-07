-- Client portal shell (2026-10-07): a CLIENT / CONSULTANT / CONTRACTOR profile cannot read `firms`
-- (staff-only policy; the membership policy needs a profile_firm_memberships row they do not have),
-- yet the portal header leads with the firm's name like the Office Hub. This returns exactly one
-- value — the caller's own active firm's company name — and nothing else.
-- APPLIED 2026-10-07 to the live `aorms-web` project.
create or replace function public.my_firm_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select f.company_name from public.firms f where f.id = public.current_firm_id();
$$;
revoke execute on function public.my_firm_name() from public, anon;
grant execute on function public.my_firm_name() to authenticated;
