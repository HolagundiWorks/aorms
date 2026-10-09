-- AQC: file attachments on versions + contractor visibility (2026-10-09).
-- 1. A version's storage_key must live under its own firm/project prefix (defence in depth; the upload route mints it).
-- 2. Contractors may read (a) bar-schedule and schedule versions staff released to them, and (b) the certified statement (ipc) of
--    their own bills. They cannot read aqc_projects, so the project lookup is a security-definer helper.
alter table public.aqc_versions add column if not exists contractor_visible boolean not null default false;

create or replace function public.aqc_add_version(p_aqc_project uuid, p_kind text, p_content_hash text, p_summary jsonb, p_storage_key text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_next integer; v_existing integer;
begin
  if auth.uid() is null or v_firm is null then raise exception 'not authorized'; end if;
  if p_kind in ('estimate', 'boq', 'schedule') and not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  if p_kind in ('running_bill', 'ipc', 'final_account') and not public.has_capability('cost:approve') then raise exception 'not authorized'; end if;
  if p_kind not in ('estimate', 'boq', 'bbs', 'schedule', 'running_bill', 'ipc', 'final_account', 'joint_measurement') or not public.has_capability('write') then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.aqc_projects where id = p_aqc_project and firm_id = v_firm) then raise exception 'AQC project not found.'; end if;
  if p_storage_key is not null and (p_storage_key not like (v_firm::text || '/' || p_aqc_project::text || '/%') or p_storage_key like '%..%') then
    raise exception 'That file does not belong to this project.';
  end if;
  select version into v_existing from public.aqc_versions where aqc_project_id = p_aqc_project and kind = p_kind and content_hash = p_content_hash limit 1;
  if v_existing is not null then return v_existing; end if;
  select coalesce(max(version), 0) + 1 into v_next from public.aqc_versions where aqc_project_id = p_aqc_project and kind = p_kind;
  insert into public.aqc_versions (firm_id, aqc_project_id, kind, version, content_hash, summary, storage_key, created_by)
  values (v_firm, p_aqc_project, p_kind, v_next, p_content_hash, coalesce(p_summary, '{}'::jsonb), p_storage_key, auth.uid());
  return v_next;
end $$;

create function public.aqc_set_contractor_visible(p_version uuid, p_visible boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  update public.aqc_versions set contractor_visible = coalesce(p_visible, false)
   where id = p_version and firm_id = public.current_firm_id() and kind in ('bbs', 'schedule');
end $$;

create function public.aqc_project_ids_for_my_contractor()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select ap.id from public.aqc_projects ap
  where ap.firm_id = public.current_firm_id() and ap.project_office_id in (select public.my_contractor_project_ids())
$$;

revoke execute on function public.aqc_set_contractor_visible(uuid, boolean) from public, anon;
revoke execute on function public.aqc_project_ids_for_my_contractor() from public, anon;
grant execute on function public.aqc_set_contractor_visible(uuid, boolean) to authenticated;
grant execute on function public.aqc_project_ids_for_my_contractor() to authenticated;

create policy "aqc_versions: contractor read" on public.aqc_versions for select
  using (public.current_app_role() = 'CONTRACTOR' and firm_id = public.current_firm_id() and (
    (contractor_visible and kind in ('bbs', 'schedule') and aqc_project_id in (select public.aqc_project_ids_for_my_contractor()))
    or (kind = 'ipc' and (summary ->> 'billId') in (select b.id::text from public.pmc_ra_bills b where b.submitted_by_contractor_id = public.my_contractor_id()))
  ));
