-- Suite (2026-10-11): the CAD program (AAD) publishes its take-off as a version of kind 'cad_bridge' — the `hcw-aqc-bridge` v1
-- JSON file — and AQC pulls the latest and feeds its importer. Needs `write`; never client- or contractor-visible
-- (aqc_released_versions_v2 only lists estimate/schedule, aqc_set_contractor_visible only bbs/schedule).
alter table public.aqc_versions drop constraint aqc_versions_kind_check;
alter table public.aqc_versions add constraint aqc_versions_kind_check
  check (kind in ('estimate', 'boq', 'bbs', 'schedule', 'running_bill', 'ipc', 'final_account', 'joint_measurement', 'cad_bridge'));

create or replace function public.aqc_add_version(p_aqc_project uuid, p_kind text, p_content_hash text, p_summary jsonb, p_storage_key text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_next integer; v_existing integer;
begin
  if auth.uid() is null or v_firm is null then raise exception 'not authorized'; end if;
  if p_kind in ('estimate', 'boq', 'schedule') and not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  if p_kind in ('running_bill', 'ipc', 'final_account') and not public.has_capability('cost:approve') then raise exception 'not authorized'; end if;
  if p_kind not in ('estimate', 'boq', 'bbs', 'schedule', 'running_bill', 'ipc', 'final_account', 'joint_measurement', 'cad_bridge') or not public.has_capability('write') then raise exception 'not authorized'; end if;
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
