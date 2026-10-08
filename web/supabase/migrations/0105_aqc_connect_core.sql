-- AQC <-> AORMS connection, core (2026-10-09). See docs/esti/AQC-CONNECT-PLAN.md (P1 session, P2 store).
-- One active AQC session per account; a generic lossless row store for every AQC project section; immutable versions.
-- Tables are read-only to clients: every write goes through the security-definer functions below, which check the
-- caller's firm, capability and (for rows) the project edit lease. AQC never sees a service-role key.

-- ── one active session per user (D8) ───────────────────────────────────────────────────────────────────────────
create table public.aqc_sessions (
  account_id uuid primary key references auth.users (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  session_id uuid not null default gen_random_uuid(),
  client_label text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.aqc_sessions enable row level security;
create policy "aqc_sessions: own read" on public.aqc_sessions for select using (account_id = auth.uid());

-- Starting a session replaces any previous one (the older client then gets session_replaced).
create function public.aqc_start_session(p_client_label text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_session uuid := gen_random_uuid();
begin
  if auth.uid() is null or v_firm is null then raise exception 'not authorized'; end if;
  insert into public.aqc_sessions (account_id, firm_id, session_id, client_label)
  values (auth.uid(), v_firm, v_session, left(p_client_label, 120))
  on conflict (account_id) do update
    set firm_id = excluded.firm_id, session_id = excluded.session_id, client_label = excluded.client_label,
        started_at = now(), last_seen_at = now();
  return v_session;
end $$;

-- True while p_session is still the account's current session; refreshes last_seen_at.
create function public.aqc_touch_session(p_session uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_n integer;
begin
  if auth.uid() is null then return false; end if;
  update public.aqc_sessions set last_seen_at = now()
   where account_id = auth.uid() and session_id = p_session and firm_id = public.current_firm_id();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- ── projects bound to AORMS projects (adopt once) ─────────────────────────────────────────────────────────────
create table public.aqc_projects (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  project_office_id uuid not null unique references public.project_offices (id) on delete cascade,
  format_version integer not null default 17,
  settings jsonb not null default '{}'::jsonb,
  head_seq bigint not null default 0,
  lease_holder uuid references auth.users (id) on delete set null,
  lease_expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index aqc_projects_firm_id_idx on public.aqc_projects (firm_id);
alter table public.aqc_projects enable row level security;
create policy "aqc_projects: staff read" on public.aqc_projects for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

create table public.aqc_rows (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  aqc_project_id uuid not null references public.aqc_projects (id) on delete cascade,
  section text not null check (section ~ '^[a-z_]{1,40}$'),
  row_id text not null check (length(row_id) between 1 and 64),
  fields jsonb not null,
  deleted boolean not null default false,
  seq bigint not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (aqc_project_id, section, row_id)
);
create index aqc_rows_project_seq_idx on public.aqc_rows (aqc_project_id, seq);
create index aqc_rows_firm_id_idx on public.aqc_rows (firm_id);
alter table public.aqc_rows enable row level security;
create policy "aqc_rows: staff read" on public.aqc_rows for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

create table public.aqc_versions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  aqc_project_id uuid not null references public.aqc_projects (id) on delete cascade,
  kind text not null check (kind in ('estimate', 'boq', 'bbs', 'schedule', 'running_bill', 'ipc', 'final_account', 'joint_measurement')),
  version integer not null,
  content_hash text not null,
  summary jsonb not null default '{}'::jsonb,
  storage_key text,
  client_visible boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (aqc_project_id, kind, version)
);
create index aqc_versions_firm_id_idx on public.aqc_versions (firm_id);
alter table public.aqc_versions enable row level security;
create policy "aqc_versions: staff read" on public.aqc_versions for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── writes ───────────────────────────────────────────────────────────────────────────────────────────────────
-- Bind (adopt) an AORMS project once. Refuses a second bind of the same project.
create function public.aqc_bind_project(p_project_office uuid, p_format_version integer, p_settings jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_id uuid;
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('write') then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.project_offices where id = p_project_office and firm_id = v_firm) then
    raise exception 'That project is not in your studio.';
  end if;
  if exists (select 1 from public.aqc_projects where project_office_id = p_project_office) then
    raise exception 'That project already has an AQC project bound to it.';
  end if;
  insert into public.aqc_projects (firm_id, project_office_id, format_version, settings, created_by, lease_holder, lease_expires_at)
  values (v_firm, p_project_office, coalesce(p_format_version, 17), coalesce(p_settings, '{}'::jsonb), auth.uid(), auth.uid(), now() + interval '2 minutes')
  returning id into v_id;
  return v_id;
end $$;

-- Edit lease: one writer per project (2-minute lease, renewed by calling again). Returns whether the caller holds it.
create function public.aqc_acquire_lease(p_aqc_project uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_n integer;
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('write') then raise exception 'not authorized'; end if;
  update public.aqc_projects
     set lease_holder = auth.uid(), lease_expires_at = now() + interval '2 minutes'
   where id = p_aqc_project and firm_id = v_firm
     and (lease_holder is null or lease_holder = auth.uid() or lease_expires_at is null or lease_expires_at < now());
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- Upsert a batch of rows: [{section,row_id,fields,deleted?}]. Needs the lease. Returns the new head seq.
create function public.aqc_push_rows(p_aqc_project uuid, p_rows jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_p record; v_row jsonb; v_seq bigint;
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('write') then raise exception 'not authorized'; end if;
  select * into v_p from public.aqc_projects where id = p_aqc_project and firm_id = v_firm for update;
  if not found then raise exception 'AQC project not found.'; end if;
  if v_p.lease_holder is distinct from auth.uid() or v_p.lease_expires_at is null or v_p.lease_expires_at < now() then
    raise exception 'lease_required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'Send between 0 and 2000 rows per batch.'; end if;
  v_seq := v_p.head_seq;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_seq := v_seq + 1;
    insert into public.aqc_rows (firm_id, aqc_project_id, section, row_id, fields, deleted, seq, updated_by)
    values (v_firm, p_aqc_project, v_row->>'section', v_row->>'row_id', coalesce(v_row->'fields', '{}'::jsonb), coalesce((v_row->>'deleted')::boolean, false), v_seq, auth.uid())
    on conflict (aqc_project_id, section, row_id) do update
      set fields = excluded.fields, deleted = excluded.deleted, seq = excluded.seq, updated_by = excluded.updated_by, updated_at = now();
  end loop;
  update public.aqc_projects set head_seq = v_seq, updated_at = now(), lease_expires_at = now() + interval '2 minutes' where id = p_aqc_project;
  return v_seq;
end $$;

-- Replace the project-level settings JSON (levels, markups, covers, yields, link rules). Needs the lease.
create function public.aqc_set_settings(p_aqc_project uuid, p_settings jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_p record;
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('write') then raise exception 'not authorized'; end if;
  select * into v_p from public.aqc_projects where id = p_aqc_project and firm_id = v_firm for update;
  if not found then raise exception 'AQC project not found.'; end if;
  if v_p.lease_holder is distinct from auth.uid() or v_p.lease_expires_at is null or v_p.lease_expires_at < now() then raise exception 'lease_required'; end if;
  update public.aqc_projects set settings = coalesce(p_settings, '{}'::jsonb), updated_at = now() where id = p_aqc_project;
end $$;

-- Add an immutable version (estimate, BOQ, certified bill ...). Version numbers are assigned here, per project and kind.
create function public.aqc_add_version(p_aqc_project uuid, p_kind text, p_content_hash text, p_summary jsonb, p_storage_key text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_next integer; v_existing integer;
begin
  if auth.uid() is null or v_firm is null then raise exception 'not authorized'; end if;
  if p_kind in ('estimate', 'boq', 'schedule') and not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  if p_kind in ('running_bill', 'ipc', 'final_account') and not public.has_capability('cost:approve') then raise exception 'not authorized'; end if;
  if p_kind not in ('estimate', 'boq', 'bbs', 'schedule', 'running_bill', 'ipc', 'final_account', 'joint_measurement') or not public.has_capability('write') then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.aqc_projects where id = p_aqc_project and firm_id = v_firm) then raise exception 'AQC project not found.'; end if;
  -- Content-hash skip: re-publishing identical content returns the existing version.
  select version into v_existing from public.aqc_versions where aqc_project_id = p_aqc_project and kind = p_kind and content_hash = p_content_hash limit 1;
  if v_existing is not null then return v_existing; end if;
  select coalesce(max(version), 0) + 1 into v_next from public.aqc_versions where aqc_project_id = p_aqc_project and kind = p_kind;
  insert into public.aqc_versions (firm_id, aqc_project_id, kind, version, content_hash, summary, storage_key, created_by)
  values (v_firm, p_aqc_project, p_kind, v_next, p_content_hash, coalesce(p_summary, '{}'::jsonb), p_storage_key, auth.uid());
  return v_next;
end $$;

-- Staff action (D10): release a version to the client. Never set by sync.
create function public.aqc_set_client_visible(p_version uuid, p_visible boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  update public.aqc_versions set client_visible = coalesce(p_visible, false) where id = p_version and firm_id = public.current_firm_id();
end $$;

-- Functions are callable by signed-in users only.
do $$
declare f text;
begin
  foreach f in array array[
    'aqc_start_session(text)', 'aqc_touch_session(uuid)', 'aqc_bind_project(uuid, integer, jsonb)', 'aqc_acquire_lease(uuid)',
    'aqc_push_rows(uuid, jsonb)', 'aqc_set_settings(uuid, jsonb)', 'aqc_add_version(uuid, text, text, jsonb, text)', 'aqc_set_client_visible(uuid, boolean)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('aqc', 'aqc', false) on conflict (id) do nothing;
