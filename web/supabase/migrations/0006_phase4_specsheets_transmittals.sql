-- Phase 4 — Spec sheets + Transmittals. Both plain protectedProcedure
-- (is_office_staff()) per the Phase 4 audit — no capability gate, unlike
-- Rate Books/Estimates. spec_items references spec_catalog_items, which
-- isn't ported yet (Phase 9/Library) — FK deferred, same approach as
-- Phase 3's po_items -> spec_items/catalog_items deferral.

create table public.spec_sheets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  title text not null,
  version_no integer not null default 1,
  status text not null default 'DRAFT',
  revision_note text,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spec_sheets enable row level security;
create policy "spec_sheets: staff read" on public.spec_sheets
  for select using (public.is_office_staff());
create policy "spec_sheets: staff write" on public.spec_sheets
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.spec_items (
  id uuid primary key default gen_random_uuid(),
  spec_sheet_id uuid not null references public.spec_sheets (id) on delete cascade,
  -- catalog_item_id deferred until Library/spec_catalog_items exists (Phase 9).
  category text,
  item text not null,
  make text,
  specification text,
  finish text,
  remarks text,
  sort_order integer not null default 0
);

alter table public.spec_items enable row level security;
create policy "spec_items: staff read" on public.spec_items
  for select using (public.is_office_staff());
create policy "spec_items: staff write" on public.spec_items
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.transmittals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  recipient text not null,
  purpose text not null,
  channel text not null,
  date_issued date,
  notes text,
  -- Receiver acknowledgment (SOP §3) — one-way; stamped by staff OR the
  -- client portal via acknowledge_transmittal() below, never a direct
  -- client UPDATE.
  acknowledged_at timestamptz,
  acknowledged_by text,
  acknowledgment_note text,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transmittals enable row level security;
create policy "transmittals: staff read" on public.transmittals
  for select using (public.is_office_staff());
create policy "transmittals: staff write" on public.transmittals
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- Client-portal read: a client may see transmittals issued on their own
-- project (needed to know what to acknowledge), mirrors "clients: own
-- portal read" from Phase 2's migration.
create policy "transmittals: own portal read" on public.transmittals
  for select using (
    public.current_app_role() = 'CLIENT'
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

create table public.transmittal_items (
  id uuid primary key default gen_random_uuid(),
  transmittal_id uuid not null references public.transmittals (id) on delete cascade,
  -- drawing_id FK deferred until `drawings` exists later in this phase.
  drawing_id uuid,
  drawing_ref text not null,
  title text not null,
  rev text,
  copies integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.transmittal_items enable row level security;
create policy "transmittal_items: staff read" on public.transmittal_items
  for select using (public.is_office_staff());
create policy "transmittal_items: staff write" on public.transmittal_items
  for all using (public.is_office_staff()) with check (public.is_office_staff());
create policy "transmittal_items: own portal read" on public.transmittal_items
  for select using (
    public.current_app_role() = 'CLIENT'
    and transmittal_id in (
      select t.id from public.transmittals t
      join public.project_offices po on po.id = t.project_id
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- Client-portal acknowledgment — a narrow SECURITY DEFINER RPC rather than a
-- blanket client UPDATE policy, per the Phase 4 audit: RLS can't restrict an
-- UPDATE to only three columns, and a client must never be able to touch the
-- rest of the row (pdf_key, notes, etc.). Validates the caller is CLIENT and
-- owns the transmittal's project before stamping.
create or replace function public.acknowledge_transmittal(
  p_transmittal_id uuid,
  p_acknowledged_by text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owns boolean;
begin
  if public.current_app_role() <> 'CLIENT' then
    raise exception 'Only a client-portal user may acknowledge a transmittal via this function.';
  end if;

  select exists (
    select 1 from public.transmittals t
    join public.project_offices po on po.id = t.project_id
    where t.id = p_transmittal_id
      and po.client_id = (select client_id from public.profiles where id = auth.uid())
  ) into v_owns;

  if not v_owns then
    raise exception 'Transmittal % does not belong to your project.', p_transmittal_id;
  end if;

  update public.transmittals
  set acknowledged_at = now(),
      acknowledged_by = p_acknowledged_by,
      acknowledgment_note = p_note,
      updated_at = now()
  where id = p_transmittal_id;
end;
$$;

comment on function public.acknowledge_transmittal(uuid, text, text) is
  'Client-portal transmittal acknowledgment. security definer + explicit ownership check stands in for column-level RLS, which Postgres RLS cannot express directly.';
