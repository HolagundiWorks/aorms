-- Phase 4 — Rate Books + Estimates (BOQ + measurement book).
-- Port of backend/src/db/schema/estimation.ts + the pure business logic in
-- packages/contracts/src/estimation.ts. Both `fees:manage`-gated (same
-- capability, same tier as Phase 3's Proposals — exposes firm cost/pricing
-- data), per docs/esti/NEXTJS-MIGRATION-PHASE4-AUDIT.md.
--
-- Ships WITHOUT the plan-markup/measurement-book/joint-measurement import
-- path (source_measurement_row_id kept as a plain column for future use, but
-- nothing references it yet) — the audit's recommended smaller first slice.
--
-- Defense-in-depth departure from a pure DDL port, per the audit's own
-- flag: "RLS alone doesn't stop a staff member's own client from writing a
-- stale computed quantity" — recomputes are Postgres triggers here, not left
-- to application code alone (unlike Phase 3, where no table had derived
-- columns). Estimate *totals* are NOT stored anywhere, on purpose — mirrors
-- today's system exactly: computeEstimateTotals() derives them at read time
-- from items, `estimates` has no totals columns in the current schema either.

create table public.rate_books (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version_label text,
  effective_date date,
  description text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_books enable row level security;
create policy "rate_books: fees:manage read" on public.rate_books
  for select using (public.has_capability('fees:manage'));
create policy "rate_books: fees:manage write" on public.rate_books
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

create table public.rate_book_items (
  id uuid primary key default gen_random_uuid(),
  rate_book_id uuid not null references public.rate_books (id) on delete cascade,
  sort_order integer not null default 0,
  item_code text,
  description text not null,
  specification text,
  unit text not null,
  rate_paise bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_book_items enable row level security;
create policy "rate_book_items: fees:manage read" on public.rate_book_items
  for select using (public.has_capability('fees:manage'));
create policy "rate_book_items: fees:manage write" on public.rate_book_items
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  rate_book_id uuid not null references public.rate_books (id),
  title text not null,
  date date,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'FINALISED', 'APPROVED', 'CANCELLED')),
  contingency_pct double precision not null default 0,
  gst_pct double precision not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.estimates enable row level security;
create policy "estimates: fees:manage read" on public.estimates
  for select using (public.has_capability('fees:manage'));
create policy "estimates: fees:manage write" on public.estimates
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  sort_order integer not null default 0,
  rate_book_item_id uuid references public.rate_book_items (id),
  item_code text,
  description text not null,
  unit text not null,
  quantity double precision not null default 0,
  rate_paise bigint not null default 0,
  amount_paise bigint not null default 0,
  -- Provenance only (e.g. plastering -> brickwork) — no cascade, no FK
  -- constraint in the current schema either.
  linked_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.estimate_items enable row level security;
create policy "estimate_items: fees:manage read" on public.estimate_items
  for select using (public.has_capability('fees:manage'));
create policy "estimate_items: fees:manage write" on public.estimate_items
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

create table public.estimate_measurements (
  id uuid primary key default gen_random_uuid(),
  estimate_item_id uuid not null references public.estimate_items (id) on delete cascade,
  sort_order integer not null default 0,
  description text,
  nos double precision not null default 1,
  length double precision not null default 0,
  breadth double precision not null default 0,
  depth double precision not null default 0,
  -- directQuantity for WEIGHT/LUMPSUM shapes; computed contribution otherwise
  -- (mirrors the current schema's dual-purpose `quantity` column exactly).
  quantity double precision not null default 0,
  -- Import-from-takeoff provenance column, kept but unused — see header note.
  source_measurement_row_id uuid,
  created_at timestamptz not null default now()
);

alter table public.estimate_measurements enable row level security;
create policy "estimate_measurements: fees:manage read" on public.estimate_measurements
  for select using (public.has_capability('fees:manage'));
create policy "estimate_measurements: fees:manage write" on public.estimate_measurements
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

-- ── Business logic ports ────────────────────────────────────────────────

-- Port of shapeForUnit() (packages/contracts/src/estimation.ts). Unit-string
-- tolerant classifier — same branch order and substring rules as the TS.
create or replace function public.shape_for_unit(p_unit text)
returns text
language plpgsql
immutable
as $$
declare
  u text := lower(regexp_replace(coalesce(p_unit, ''), '[^a-z0-9]', '', 'gi'));
begin
  if u = '' then return 'COUNT'; end if;
  if u in ('cum','cm','m3','cbm','cft','cuft','ft3','brass')
     or u like '%cum%' or u like '%cubic%' or u like '%cuft%' or u like '%cft%' then
    return 'VOLUME';
  end if;
  if u in ('sqm','m2','sm','sqft','sft','ft2')
     or u like '%sqm%' or u like '%sqmt%' or u like '%sqmtr%' or u like '%sqft%'
     or u like '%sft%' or u like '%sq%' or u like '%square%' then
    return 'AREA';
  end if;
  if u in ('rmt','rm','m','mtr','rmtr','metre','meter','lm','rft','ft','feet','foot','rf')
     or u like '%running%' or u like '%rmt%' or u like '%rft%' then
    return 'LENGTH';
  end if;
  if u in ('kg','kgs','kilogram','mt','ton','tonne','tonnes','quintal','qtl')
     or u like '%kg%' or u like '%ton%' or u like '%quintal%' then
    return 'WEIGHT';
  end if;
  if u in ('ls','lumpsum','lump','job') or u like '%lump%' then
    return 'LUMPSUM';
  end if;
  return 'COUNT';
end;
$$;

-- Port of measurementQuantity() (same file). nos=0 treated as 1, as upstream.
create or replace function public.measurement_quantity(
  p_shape text, p_nos double precision, p_length double precision,
  p_breadth double precision, p_depth double precision, p_direct_quantity double precision
)
returns double precision
language plpgsql
immutable
as $$
declare
  n double precision := case when p_nos = 0 then 1 else p_nos end;
begin
  return case p_shape
    when 'COUNT' then n
    when 'LENGTH' then n * p_length
    when 'AREA' then n * p_length * p_breadth
    when 'VOLUME' then n * p_length * p_breadth * p_depth
    when 'WEIGHT' then p_direct_quantity
    when 'LUMPSUM' then p_direct_quantity
    else n
  end;
end;
$$;

-- Port of isEstimateEditable()/estimateLockedError(). APPROVED/CANCELLED are
-- frozen — re-price by moving back to DRAFT first (leaves a status trail).
create or replace function public.assert_estimate_editable(p_estimate_id uuid)
returns void
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from public.estimates where id = p_estimate_id;
  if v_status is null then
    raise exception 'Estimate % not found', p_estimate_id;
  end if;
  if v_status not in ('DRAFT', 'FINALISED') then
    raise exception 'This estimate is % and cannot be changed. Move it back to draft to re-price it.', lower(v_status);
  end if;
end;
$$;

-- Recompute one estimate_item's quantity from its measurement-book rows
-- (sum of measurement_quantity() per row, shape derived from the item's
-- unit) — port of recomputeItemFromMeasurements(). Fires on every
-- measurement write, matching the current router's behaviour exactly
-- (every write recomputes the parent item, not a periodic/batch job).
create or replace function public.recompute_estimate_item_from_measurements()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid := coalesce(new.estimate_item_id, old.estimate_item_id);
  v_estimate_id uuid;
  v_unit text;
  v_shape text;
  v_qty double precision;
begin
  select estimate_id into v_estimate_id
  from public.estimate_items ei
  join public.estimates e on e.id = ei.estimate_id
  where ei.id = v_item_id;

  -- Parent item/estimate already gone (e.g. a cascade delete from estimates
  -- or estimate_items reaching this row) — nothing to recompute or lock-check.
  if v_estimate_id is null then
    return coalesce(new, old);
  end if;

  perform public.assert_estimate_editable(v_estimate_id);

  select unit into v_unit from public.estimate_items where id = v_item_id;
  v_shape := public.shape_for_unit(v_unit);

  select coalesce(sum(public.measurement_quantity(v_shape, m.nos, m.length, m.breadth, m.depth, m.quantity)), 0)
  into v_qty
  from public.estimate_measurements m
  where m.estimate_item_id = v_item_id;

  update public.estimate_items
  set quantity = v_qty,
      amount_paise = round(rate_paise * v_qty),
      updated_at = now()
  where id = v_item_id;

  return coalesce(new, old);
end;
$$;

create trigger estimate_measurements_recompute
  after insert or update or delete on public.estimate_measurements
  for each row execute function public.recompute_estimate_item_from_measurements();

-- A direct edit to an item's own rate/quantity (no measurement rows, or a
-- rate change) also needs amount_paise recomputed and the lock re-checked —
-- covers WEIGHT/LUMPSUM items and rate-only edits the trigger above doesn't
-- touch since they don't go through estimate_measurements.
create or replace function public.recompute_estimate_item_amount()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.rate_paise is distinct from old.rate_paise
     or new.quantity is distinct from old.quantity then
    perform public.assert_estimate_editable(new.estimate_id);
    new.amount_paise := round(new.rate_paise * new.quantity);
  end if;
  return new;
end;
$$;

create trigger estimate_items_recompute_amount
  before insert or update on public.estimate_items
  for each row execute function public.recompute_estimate_item_amount();

comment on function public.recompute_estimate_item_from_measurements() is
  'Port of recomputeItemFromMeasurements() (backend/src/modules/estimate/router.ts). Defense-in-depth: enforced as a trigger, not application-code-only, since RLS cannot stop a client writing a stale computed quantity directly.';
