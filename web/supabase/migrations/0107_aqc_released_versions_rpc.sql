-- AQC: client portal read by project (2026-10-09). A client cannot read aqc_projects, so the project page asks this
-- security-definer function for the versions staff released for one of the caller's own projects.
create function public.aqc_released_versions(p_project_office uuid)
returns table (id uuid, kind text, version integer, summary jsonb, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select v.id, v.kind, v.version, v.summary, v.created_at
  from public.aqc_versions v
  join public.aqc_projects ap on ap.id = v.aqc_project_id
  join public.project_offices po on po.id = ap.project_office_id
  where ap.project_office_id = p_project_office
    and v.client_visible and v.kind in ('estimate', 'schedule')
    and v.firm_id = public.current_firm_id()
    and po.client_id = (select p.client_id from public.profiles p where p.id = auth.uid())
  order by v.created_at desc
$$;
revoke execute on function public.aqc_released_versions(uuid) from public, anon;
grant execute on function public.aqc_released_versions(uuid) to authenticated;
