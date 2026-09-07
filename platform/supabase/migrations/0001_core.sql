-- AORMS Platform — core identity model: personal accounts, companies,
-- memberships. This is the central database a firm's single-tenant web/
-- app (see web/supabase/migrations/0029_platform_link.sql) links into by
-- storing a person's AORMS-U- handle on their local profile — it does NOT
-- replace or merge with web/'s own schema. See docs/esti/AORMS-IDENTITY.md
-- for the design this rebuilds (that version targeted the now-dead
-- backend/ stack) and the AORMS Platform plan for what's deliberately
-- simplified here (public_id minted immediately, not "earned").
--
-- Table/column names are fresh, un-prefixed snake_case, matching the same
-- convention web/supabase/migrations/0001_phase2_core.sql established.

-- ── public_id generator ─────────────────────────────────────────────────
-- Crockford base32 (excludes I, L, O, U to avoid visual ambiguity),
-- 4-character suffix — matches the AORMS-U-9F3T / AORMS-C-2K4P shape from
-- docs/esti/AORMS-IDENTITY.md §3. p_table names the table to check for
-- collisions against (accounts or companies each have their own
-- public_id uniqueness domain).
create function public.new_public_id(p_prefix text, p_table text)
returns text
language plpgsql
as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  suffix text;
  already_taken boolean;
  i int;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    suffix := '';
    for i in 1..4 loop
      suffix := suffix || substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1);
    end loop;
    candidate := p_prefix || suffix;
    execute format('select exists(select 1 from public.%I where public_id = $1)', p_table)
      into already_taken
      using candidate;
    exit when not already_taken;
    if attempt > 20 then
      raise exception 'new_public_id: no unique id after 20 attempts (prefix=%, table=%)', p_prefix, p_table;
    end if;
  end loop;
  return candidate;
end;
$$;

-- ── accounts (personal identity) ────────────────────────────────────────
-- 1:1 with this project's own auth.users — mirrors web/'s profiles/
-- handle_new_user() pattern exactly, just in a separate database. The
-- AORMS-U- handle is minted immediately (see header note), never changes,
-- and is the join key web/'s profiles.platform_public_id stores.
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  public_id text unique not null,
  total_active_seconds bigint not null default 0,
  level text not null default 'BASIC' check (level in ('BASIC', 'PRO')),
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create function public.handle_new_platform_account()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.accounts (id, full_name, public_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    public.new_public_id('AORMS-U-', 'accounts')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_platform_account();

-- Read-only to the owning account from the client; total_active_seconds/
-- level only ever change via the service-role heartbeat path (see
-- 0002_usage_and_level.sql) or the definer trigger above — no update/
-- insert policy is granted to the authenticated role at all, so both stay
-- denied by RLS's default-deny.
create policy "accounts: self read" on public.accounts
  for select using (id = auth.uid());

-- ── companies ────────────────────────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_id text unique not null,
  login_domain text unique,
  owner_id uuid not null references public.accounts (id),
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Mints the AORMS-C- handle on insert (immediately — see header note).
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

-- Any authenticated platform user can read the company directory (needed
-- to resolve "join by name/handle" before membership exists); only the
-- owner can update the row.
create policy "companies: authenticated read" on public.companies
  for select to authenticated using (true);
create policy "companies: self insert" on public.companies
  for insert with check (owner_id = auth.uid());

-- ── memberships (the account × company join — many-companies-per-person) ──
create table public.memberships (
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

alter table public.memberships enable row level security;

-- Helper (security definer, like web/'s current_app_role()/is_office_staff())
-- so the "is this caller an OWNER of this company" check used in several
-- policies below doesn't hit RLS-recursion issues on memberships itself.
create function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and account_id = auth.uid()
      and role = 'OWNER'
      and status = 'ACTIVE'
  );
$$;

-- Auto-creates the founding OWNER/ACTIVE membership whenever a company is
-- created — this is what lets companies: self insert (owner_id = auth.uid())
-- above be the only thing a Server Action needs to do to found a company.
create function public.handle_new_company_owner_membership()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.memberships (account_id, company_id, role, status, activated_at)
  values (new.owner_id, new.id, 'OWNER', 'ACTIVE', now());
  return new;
end;
$$;

create trigger after_company_insert
  after insert on public.companies
  for each row execute function public.handle_new_company_owner_membership();

create policy "memberships: self read" on public.memberships
  for select using (account_id = auth.uid());
create policy "memberships: company owner reads all" on public.memberships
  for select using (public.is_company_owner(company_id));
create policy "memberships: self insert" on public.memberships
  for insert with check (account_id = auth.uid());
create policy "memberships: owner insert (invite)" on public.memberships
  for insert with check (public.is_company_owner(company_id));
create policy "memberships: self update (leave)" on public.memberships
  for update using (account_id = auth.uid());
create policy "memberships: owner update" on public.memberships
  for update using (public.is_company_owner(company_id));
