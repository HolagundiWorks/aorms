-- Phase 8/9 (proposed) — Delivery's remaining tables (contractors,
-- contractor_submissions, approvals — drawings/transmittals/transmittal_items
-- already landed earlier) + firm-issued Tenders.
--
-- Capability gates confirmed from the routers directly: contractor/approval
-- CRUD is bare protectedProcedure (is_office_staff()); tenders read is also
-- protectedProcedure, tender write is capabilityProcedure("write").
--
-- Sealed-bid rule (Phase 9 audit's headline RLS concern): tenderBidsVisibleToFirm()
-- (packages/contracts/src/tender.ts) hides a bid's amount_paise/notes from the
-- FIRM'S OWN STAFF until the tender is CLOSED or AWARDED — today this is
-- enforced only in application code (backend/src/modules/tender/router.ts's
-- byId nulls the fields after an unfiltered SELECT). Plain row-level RLS
-- cannot redact individual columns, so the base table stays staff-readable
-- (matching current behaviour — any office staff can query tender_bids
-- directly today, nothing regresses) and `tender_bids_sealed` is the
-- redacting view: Server Components should query THIS, not the base table,
-- to actually enforce the seal for defense-in-depth. This is flagged as a
-- real design decision made here, not a silent gap.

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  name text not null,
  category text not null,
  company_name text,
  contact_person text,
  gstin text,
  pan text,
  email text,
  phone text,
  city text,
  state text,
  active boolean not null default true,
  quality_rating integer,
  timeliness_rating integer,
  safety_rating integer,
  notes text,
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contractors enable row level security;
create policy "contractors: staff read" on public.contractors
  for select using (public.is_office_staff());
create policy "contractors: staff write" on public.contractors
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.contractor_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id),
  contractor_id uuid not null references public.contractors (id),
  kind text not null,
  subject text not null,
  body text,
  status text not null default 'OPEN',
  response_note text,
  storage_key text,
  file_name text,
  submitted_by_id uuid references public.profiles (id),
  attention_to_id uuid references public.profiles (id) on delete set null,
  review_code text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contractor_submissions enable row level security;
create policy "contractor_submissions: staff read" on public.contractor_submissions
  for select using (public.is_office_staff());
create policy "contractor_submissions: staff write" on public.contractor_submissions
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id),
  entity_type text not null,
  title text not null,
  recipient text,
  channel text not null,
  status text not null default 'DRAFT',
  sent_date date,
  response_date date,
  remarks text,
  supersedes_id uuid,
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.approvals enable row level security;
create policy "approvals: staff read" on public.approvals
  for select using (public.is_office_staff());
create policy "approvals: staff write" on public.approvals
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- ── Tenders ─────────────────────────────────────────────────────────────

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  title text not null,
  category text,
  scope text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'OPEN', 'CLOSED', 'AWARDED', 'CANCELLED')),
  due_date date,
  instructions text,
  awarded_contractor_id uuid references public.contractors (id) on delete set null,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenders enable row level security;
create policy "tenders: staff read" on public.tenders
  for select using (public.is_office_staff());
create policy "tenders: write capability" on public.tenders
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.tender_invitations (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  status text not null default 'INVITED',
  invited_at timestamptz not null default now(),
  viewed_at timestamptz,
  unique (tender_id, contractor_id)
);

alter table public.tender_invitations enable row level security;
create policy "tender_invitations: staff read" on public.tender_invitations
  for select using (public.is_office_staff());
create policy "tender_invitations: write capability" on public.tender_invitations
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.tender_bids (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.tender_invitations (id) on delete cascade,
  amount_paise bigint not null,
  completion_weeks integer,
  -- Optional staff-only score after unsealing — not set by contractors.
  technical_score double precision,
  notes text,
  submitted_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tender_bids enable row level security;
-- Base table stays staff-readable (matches current app behaviour exactly —
-- see header comment). Contractors submit their own bid via a narrow RPC
-- (submit_tender_bid below), not a direct INSERT policy — contractor portal
-- access needs its own is_contractor()-style helper, not built yet (Phase 9
-- audit's own note: no phase before this one needed the CLIENT/CONSULTANT/
-- CONTRACTOR portal-role RLS shape).
create policy "tender_bids: staff read" on public.tender_bids
  for select using (public.is_office_staff());
create policy "tender_bids: write capability" on public.tender_bids
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- The actual seal enforcement: redacts amount_paise/notes exactly like the
-- current router's byId does, until the parent tender is CLOSED or AWARDED.
-- security_invoker so it still respects the base table's own RLS on top of
-- this redaction, not instead of it.
create view public.tender_bids_sealed
with (security_invoker = true) as
select
  b.id,
  b.invitation_id,
  case when t.status in ('CLOSED', 'AWARDED') then b.amount_paise else null end as amount_paise,
  b.completion_weeks,
  b.technical_score,
  case when t.status in ('CLOSED', 'AWARDED') then b.notes else null end as notes,
  (t.status not in ('CLOSED', 'AWARDED')) as sealed,
  b.submitted_by_id,
  b.created_at,
  b.updated_at
from public.tender_bids b
join public.tender_invitations ti on ti.id = b.invitation_id
join public.tenders t on t.id = ti.tender_id;

comment on view public.tender_bids_sealed is
  'Port of tenderBidsVisibleToFirm() (packages/contracts/src/tender.ts) as an RLS-respecting view. Query this, not tender_bids directly, wherever the current app shows bid amounts to firm staff.';
