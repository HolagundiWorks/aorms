-- Project Bar Bending Schedule (BBS) — IS 456/IS 2502 cutting-length
-- engine port from packages/contracts/src/bbs.ts + bbs-engine.ts (already
-- live, tested code in this repo's current backend — not invented fresh).
-- RLS pattern confirmed from backend/src/modules/bbs/router.ts: read is
-- bare protectedProcedure (is_office_staff()); write is
-- capabilityProcedure("write") (has_capability('write')) — same shape as
-- drawings/transmittals' write gate, matching migration 0011's documented
-- convention.
--
-- Column/Beam/Slab/Footing only (the four element types
-- packages/contracts/src/bbs.ts actually implements and tests) — Wall and
-- Stair exist in the reference desktop app (HolagundiWorks/AQC) this port
-- was requested against, but have no tested formula counterpart in this
-- repo yet; porting untested geometry from a foreign C++ codebase without
-- a way to verify it here would risk silently-wrong steel quantities, so
-- flagged as a follow-up rather than guessed at.

create table public.bbs_schedules (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id) on delete cascade,
  title text not null,
  status text not null default 'DRAFT',
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bbs_schedules enable row level security;
create policy "bbs_schedules: staff read" on public.bbs_schedules
  for select using (public.is_office_staff());
create policy "bbs_schedules: write capability" on public.bbs_schedules
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- Geometry inputs that feed the cutting-length engine (one row per RCC
-- member: a column, beam, slab, or footing) — `input` is the element's own
-- BbsColumnInput/BbsBeamInput/BbsSlabInput/BbsFootingInput shape, ported
-- verbatim from packages/contracts/src/bbs.ts's zod schemas.
create table public.bbs_members (
  id uuid primary key default gen_random_uuid(),
  bbs_id uuid not null references public.bbs_schedules (id) on delete cascade,
  element text not null,
  mark text,
  input jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bbs_members enable row level security;
create policy "bbs_members: staff read" on public.bbs_members
  for select using (public.is_office_staff());
create policy "bbs_members: write capability" on public.bbs_members
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- Schedule lines — either generated from a member (member_id set) by the
-- engine, or added manually (member_id null, e.g. an odd bar not worth
-- modeling as a full member). Diameter summary + total weight are computed
-- on read from these rows (bbsDiameterSummary), not stored.
create table public.bbs_items (
  id uuid primary key default gen_random_uuid(),
  bbs_id uuid not null references public.bbs_schedules (id) on delete cascade,
  member_id uuid references public.bbs_members (id) on delete cascade,
  bar_mark text not null,
  member text,
  element text,
  role text,
  dia_mm double precision not null,
  no_of_members integer not null default 1,
  bars_per_member integer not null default 1,
  cutting_length_mm double precision not null,
  weight_kg double precision not null default 0,
  floor text,
  shape text,
  created_at timestamptz not null default now()
);

alter table public.bbs_items enable row level security;
create policy "bbs_items: staff read" on public.bbs_items
  for select using (public.is_office_staff());
create policy "bbs_items: write capability" on public.bbs_items
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
