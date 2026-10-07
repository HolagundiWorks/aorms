-- Contractor portal (2026-10-07): a CONTRACTOR profile cannot read `project_offices` (staff/client policies
-- only), so the tender list and tender page showed "—" for the project. This returns, for the caller's
-- OWN tender invitations only, the project's reference and title — nothing else about the project.
-- APPLIED 2026-10-07 to the live `aorms-web` project.
create or replace function public.my_tender_projects()
returns table (invitation_id uuid, project_ref text, project_title text)
language sql
stable
security definer
set search_path = ''
as $$
  select ti.id, po.ref, po.title
  from public.tender_invitations ti
  join public.tenders t on t.id = ti.tender_id
  join public.project_offices po on po.id = t.project_id
  where ti.contractor_id = (select p.contractor_id from public.profiles p where p.id = auth.uid())
    and ti.firm_id = public.current_firm_id();
$$;
revoke execute on function public.my_tender_projects() from public, anon;
grant execute on function public.my_tender_projects() to authenticated;
