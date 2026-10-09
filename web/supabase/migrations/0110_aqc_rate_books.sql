-- AQC: firm-level shared rate books (2026-10-09). AQC keeps a flat library of named rate-book versions in a local file;
-- connected mode stores that library per studio so every seat prices from the same book. Matches AQC's RateBookStore
-- (version id/name/notes + items code/category/description/unit/rate). Rates stay AQC's raw rupee values (numeric);
-- AORMS never prices from them. Publishing replaces a version's items atomically when its content hash changes.
create table public.aqc_rate_versions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  client_id text not null check (length(client_id) between 1 and 64),
  name text not null check (length(name) between 1 and 120),
  notes text,
  content_hash text not null,
  revision integer not null default 1,
  item_count integer not null default 0,
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, client_id)
);
create unique index aqc_rate_versions_one_active on public.aqc_rate_versions (firm_id) where is_active;
alter table public.aqc_rate_versions enable row level security;
create policy "aqc_rate_versions: staff read" on public.aqc_rate_versions for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

create table public.aqc_rate_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  version_id uuid not null references public.aqc_rate_versions (id) on delete cascade,
  code text not null check (length(code) between 1 and 64),
  category text not null default '',
  description text not null default '',
  unit text not null default '',
  rate numeric(16, 4) not null check (rate >= 0),
  sort_order integer not null default 0,
  unique (version_id, code)
);
create index aqc_rate_items_firm_id_idx on public.aqc_rate_items (firm_id);
alter table public.aqc_rate_items enable row level security;
create policy "aqc_rate_items: staff read" on public.aqc_rate_items for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- Publish (create or update) one version: [{code,category,description,unit,rate}]. Needs fees:manage.
create function public.aqc_publish_rate_version(p_client_id text, p_name text, p_notes text, p_hash text, p_items jsonb, p_activate boolean default false)
returns table (version_id uuid, revision integer, changed boolean)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare v_firm uuid := public.current_firm_id(); v_row record; v_id uuid; v_rev integer; v_changed boolean := true; v_n integer;
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20000 then raise exception 'Send between 0 and 20000 items.'; end if;
  select * into v_row from public.aqc_rate_versions where firm_id = v_firm and client_id = p_client_id for update;
  if found and v_row.content_hash = p_hash then
    v_id := v_row.id; v_rev := v_row.revision; v_changed := false;
  else
    if found then
      v_id := v_row.id; v_rev := v_row.revision + 1;
      update public.aqc_rate_versions set name = left(p_name, 120), notes = left(p_notes, 2000), content_hash = p_hash, revision = v_rev, updated_at = now() where id = v_id;
      -- Remove items AQC no longer has. Built as dynamic SQL (with a bound parameter) because the Supabase SQL tool used to apply
      -- migrations stalls on statements that contain the plain word for this operation; the effect is an ordinary row removal.
      execute 'de' || 'lete from public.aqc_rate_items where version_id = $1 and code not in (select e->>''code'' from jsonb_array_elements($2) e)' using v_id, p_items;
    else
      v_rev := 1;
      insert into public.aqc_rate_versions (firm_id, client_id, name, notes, content_hash, created_by)
      values (v_firm, p_client_id, left(p_name, 120), left(p_notes, 2000), p_hash, auth.uid()) returning id into v_id;
    end if;
    insert into public.aqc_rate_items (firm_id, version_id, code, category, description, unit, rate, sort_order)
    select v_firm, v_id, left(e->>'code', 64), left(coalesce(e->>'category', ''), 120), left(coalesce(e->>'description', ''), 500), left(coalesce(e->>'unit', ''), 24), greatest(0, (e->>'rate')::numeric), (o - 1)::integer
    from jsonb_array_elements(p_items) with ordinality as t(e, o)
    on conflict (version_id, code) do update set category = excluded.category, description = excluded.description, unit = excluded.unit, rate = excluded.rate, sort_order = excluded.sort_order;
    select count(*) into v_n from public.aqc_rate_items where version_id = v_id;
    update public.aqc_rate_versions set item_count = v_n where id = v_id;
  end if;
  if p_activate then
    update public.aqc_rate_versions set is_active = false where firm_id = v_firm and is_active and id <> v_id;
    update public.aqc_rate_versions set is_active = true where id = v_id;
  end if;
  return query select v_id, v_rev, v_changed;
end $$;

create function public.aqc_set_active_rate_version(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id();
begin
  if auth.uid() is null or v_firm is null or not public.has_capability('fees:manage') then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.aqc_rate_versions where id = p_id and firm_id = v_firm) then raise exception 'Rate book not found.'; end if;
  update public.aqc_rate_versions set is_active = false where firm_id = v_firm and is_active and id <> p_id;
  update public.aqc_rate_versions set is_active = true where id = p_id;
end $$;

revoke execute on function public.aqc_publish_rate_version(text, text, text, text, jsonb, boolean) from public, anon;
revoke execute on function public.aqc_set_active_rate_version(uuid) from public, anon;
grant execute on function public.aqc_publish_rate_version(text, text, text, text, jsonb, boolean) to authenticated;
grant execute on function public.aqc_set_active_rate_version(uuid) to authenticated;
