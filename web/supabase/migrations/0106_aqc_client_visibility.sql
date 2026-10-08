-- AQC: client portal visibility (2026-10-09). A client may read an AQC version only after staff released it
-- (aqc_versions.client_visible, set by aqc_set_client_visible — never by sync) and only for their own project.
-- The project lookup is a security-definer helper because a client cannot read aqc_projects directly.
create function public.aqc_project_ids_for_my_client()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select ap.id from public.aqc_projects ap
  join public.project_offices po on po.id = ap.project_office_id
  where po.client_id = (select p.client_id from public.profiles p where p.id = auth.uid())
    and ap.firm_id = public.current_firm_id()
$$;
revoke execute on function public.aqc_project_ids_for_my_client() from public, anon;
grant execute on function public.aqc_project_ids_for_my_client() to authenticated;

create policy "aqc_versions: client released read" on public.aqc_versions for select
  using (public.current_app_role() = 'CLIENT' and firm_id = public.current_firm_id() and client_visible
    and kind in ('estimate', 'schedule') and aqc_project_id in (select public.aqc_project_ids_for_my_client()));
