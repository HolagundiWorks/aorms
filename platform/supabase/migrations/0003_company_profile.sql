-- Company profile — the regulatory/contact data that used to live only in
-- web/'s own `firm` table (Office Hub's Firm Settings page): COA
-- registration, GST, tax defaults, communication address, board of
-- directors, and "who's who" key contacts. This is now the source of
-- truth; web/'s own `firm` table is untouched (still read directly by
-- invoice/PDF generation there) and Firm Settings becomes a read-only
-- mirror pointing here — see the AORMS Identity/Licence portal split plan.
--
-- Column names mirror web/supabase/migrations/0001_phase2_core.sql's
-- `firm` table shape deliberately (same data, new home).
alter table public.companies
  add column coa_registration_no text,
  add column gstin text,
  add column pan text,
  add column gst_type text not null default 'REGULAR'
    check (gst_type in ('REGULAR', 'COMPOSITION', 'NOT_APPLICABLE')),
  add column tds_applicable_default boolean not null default true,
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column district text,
  add column state text,
  add column pincode text,
  add column email text,
  add column phone text;

-- ── board of directors ──────────────────────────────────────────────────
-- din (Director Identification Number) is nullable — not every practice
-- structure (e.g. a solo proprietorship) has directors with one.
create table public.company_board_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null,
  din text,
  designation text,
  appointed_at date,
  created_at timestamptz not null default now()
);

alter table public.company_board_members enable row level security;

create policy "company_board_members: members read" on public.company_board_members
  for select using (
    exists (
      select 1 from public.memberships
      where company_id = company_board_members.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "company_board_members: owner writes" on public.company_board_members
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- ── "who's who" — key contacts/signatories, distinct from the board ──────
create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.company_contacts enable row level security;

create policy "company_contacts: members read" on public.company_contacts
  for select using (
    exists (
      select 1 from public.memberships
      where company_id = company_contacts.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "company_contacts: owner writes" on public.company_contacts
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- Owner needs to update the new companies columns too — migration 0001
-- never granted an UPDATE policy on companies at all (only "self insert").
create policy "companies: owner update" on public.companies
  for update using (public.is_company_owner(id)) with check (public.is_company_owner(id));
