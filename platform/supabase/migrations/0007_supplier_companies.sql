-- Phase B of the Studio/Company split + Material Catalogue plan — the
-- genuinely new "Company" entity: material supplier businesses (building
-- materials, interior materials, finishes, other products) that own and
-- operate a Material Catalogue (Phase C, next). Reuses the freed
-- `companies`/`company_id` naming (see 0006_rename_companies_to_studios.sql)
-- and copies the Studio pattern exactly — same generator, same owner-check
-- helper shape, same auto-founding-owner-membership trigger, same
-- self-update-invariant guard — this is deliberately the same account/
-- auth.users the Studio side already uses (one person, one login, can
-- belong to Studios *and* Companies), so no new signup/login flow is
-- needed, only this second data model + a second set of Server Actions/
-- pages mirroring the Studio ones.
--
-- Column shape mirrors `studios` minus `coa_registration_no` — Council of
-- Architecture registration is architecture-specific, doesn't apply to a
-- material supplier.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_id text unique not null,
  owner_id uuid not null references public.accounts (id),
  gstin text,
  pan text,
  gst_type text not null default 'REGULAR'
    check (gst_type in ('REGULAR', 'COMPOSITION', 'NOT_APPLICABLE')),
  tds_applicable_default boolean not null default true,
  address_line1 text,
  address_line2 text,
  city text,
  district text,
  state text,
  pincode text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Mints the AORMS-C- handle on insert (immediately, same as Studios —
-- see 0001_core.sql's header note on the "earned vs. immediate" decision).
create function public.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.public_id is null then
    new.public_id := public.new_public_id('AORMS-C-', 'companies');
  end if;
  return new;
end;
$$;

create trigger before_company_insert
  before insert on public.companies
  for each row execute function public.handle_new_company();

create policy "companies: authenticated read" on public.companies
  for select to authenticated using (true);
create policy "companies: self insert" on public.companies
  for insert with check (owner_id = auth.uid());

-- ── company_memberships ───────────────────────────────────────────────────
create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER', 'MEMBER')),
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'LEFT')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  left_at timestamptz,
  unique (account_id, company_id)
);

alter table public.company_memberships enable row level security;

create function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_memberships
    where company_id = p_company_id
      and account_id = auth.uid()
      and role = 'OWNER'
      and status = 'ACTIVE'
  );
$$;

create function public.handle_new_company_owner_membership()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.company_memberships (account_id, company_id, role, status, activated_at)
  values (new.owner_id, new.id, 'OWNER', 'ACTIVE', now());
  return new;
end;
$$;

create trigger after_company_insert
  after insert on public.companies
  for each row execute function public.handle_new_company_owner_membership();

create policy "company_memberships: self read" on public.company_memberships
  for select using (account_id = auth.uid());
create policy "company_memberships: company owner reads all" on public.company_memberships
  for select using (public.is_company_owner(company_id));
create policy "company_memberships: self insert" on public.company_memberships
  for insert with check (account_id = auth.uid());
create policy "company_memberships: owner insert (invite)" on public.company_memberships
  for insert with check (public.is_company_owner(company_id));
create policy "company_memberships: self update (leave)" on public.company_memberships
  for update using (account_id = auth.uid());
create policy "company_memberships: owner update" on public.company_memberships
  for update using (public.is_company_owner(company_id));

-- Same privilege-escalation guard as studio_memberships (0005/0006) —
-- account_id/company_id immutable for everyone, service-role and the
-- genuine owner may change role/status, everyone else only a self-leave.
-- Built in from day one here rather than found by exploit, unlike the
-- Studio side originally was.
create function public.enforce_company_membership_update_invariants()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.account_id <> old.account_id or new.company_id <> old.company_id then
    raise exception 'company_memberships: account_id and company_id cannot be changed after creation';
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_company_owner(old.company_id) then
    return new;
  end if;

  if new.role <> old.role or new.status <> 'LEFT' then
    raise exception 'company_memberships: self-service updates may only set status to LEFT (leaving) — role cannot be changed by anyone but the company owner';
  end if;

  return new;
end;
$$;

create trigger before_company_membership_update
  before update on public.company_memberships
  for each row execute function public.enforce_company_membership_update_invariants();

-- Owner needs to update companies' own columns too — mirrors "studios:
-- owner update" (0003/0006).
create policy "companies: owner update" on public.companies
  for update using (public.is_company_owner(id)) with check (public.is_company_owner(id));

-- ── board of directors ──────────────────────────────────────────────────
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
      select 1 from public.company_memberships
      where company_id = company_board_members.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "company_board_members: owner writes" on public.company_board_members
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- ── "who's who" — key contacts/signatories ────────────────────────────────
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
      select 1 from public.company_memberships
      where company_id = company_contacts.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "company_contacts: owner writes" on public.company_contacts
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
