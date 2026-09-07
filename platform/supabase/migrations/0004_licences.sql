-- AORMS Licence Management — one licence per company, auto-provisioned as
-- a TRIAL on company creation. No stored `status` column: ACTIVE vs
-- EXPIRED is computed from expires_at at read time (null = no expiry),
-- avoiding a mutable column that would need to stay in sync with the
-- clock. No billing/payment integration exists in this stack — the owner
-- self-serves plan/seats/expires_at directly, same trust model as every
-- other owner-only mutation in this system so far.
create table public.licences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete cascade,
  plan text not null default 'TRIAL' check (plan in ('TRIAL', 'STANDARD', 'PREMIUM')),
  seats int not null default 1 check (seats > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.licences enable row level security;

create policy "licences: members read" on public.licences
  for select using (
    exists (
      select 1 from public.memberships
      where company_id = licences.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "licences: owner update" on public.licences
  for update using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- Auto-provision a 30-day TRIAL licence alongside the founding OWNER
-- membership (0001_core.sql's after_company_insert trigger) — a second
-- trigger function on the same event, so every company always has
-- exactly one licence row from creation.
create function public.handle_new_company_licence()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.licences (company_id, plan, seats, expires_at)
  values (new.id, 'TRIAL', 1, now() + interval '30 days');
  return new;
end;
$$;

create trigger after_company_insert_licence
  after insert on public.companies
  for each row execute function public.handle_new_company_licence();
