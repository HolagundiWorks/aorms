-- Contractor Portal finance completion (2026-10-08): payments received against RA bills, and contract variations
-- (signed amounts: additions positive, omissions negative). Applied live to `aorms-web`.
alter table public.pmc_ra_bills add column if not exists paid_paise bigint not null default 0 check (paid_paise >= 0);
alter table public.pmc_ra_bills add column if not exists paid_at date;

create table if not exists public.pmc_variations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  package_id uuid not null references public.pmc_packages (id) on delete cascade,
  ref text not null,
  title text not null,
  note text,
  amount_paise bigint not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'APPROVED', 'REJECTED')),
  approved_at timestamptz,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pmc_variations_firm_id_idx on public.pmc_variations (firm_id);
create index if not exists pmc_variations_package_id_idx on public.pmc_variations (package_id);
alter table public.pmc_variations enable row level security;
create policy "pmc_variations: staff read" on public.pmc_variations for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());
create policy "pmc_variations: write capability" on public.pmc_variations for all
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
create policy "pmc_variations: contractor own approved read" on public.pmc_variations for select
  using (public.current_app_role() = 'CONTRACTOR' and firm_id = public.current_firm_id() and status = 'APPROVED'
    and package_id in (select pk.id from public.pmc_packages pk where pk.contractor_id = public.my_contractor_id()));
