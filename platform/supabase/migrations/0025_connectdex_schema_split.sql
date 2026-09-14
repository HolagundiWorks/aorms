-- 2026-09-14 — Restructure aorms-platform for future migration-readiness:
-- move the entire ConnectDeX/Company domain into its own Postgres schema
-- (`connectdex`) within the SAME project, per explicit user direction
-- ("keep it as it is for now... restructure the db for easy migration in
-- future... once the data grows I need separate platforms"). No data
-- moves, no behavior changes — this is purely a namespace move so a later
-- physical split into a genuinely separate Supabase project (once
-- ConnectDeX has real traffic) is a mechanical `pg_dump --schema=connectdex`
-- + restore, not a fresh audit of which tables belong where.
--
-- Why this is safe: `ALTER TABLE/FUNCTION ... SET SCHEMA` preserves every
-- foreign key, RLS policy, index, and trigger attachment automatically —
-- Postgres resolves all of those by object OID internally, not by
-- re-parsing a schema-qualified name. Confirmed via pg_policies/pg_trigger
-- before writing this migration: the two RLS policies that reference
-- `company_memberships` from `company_board_members`/`company_contacts`,
-- and every FK below, are all OID-based and need zero changes. The only
-- things that genuinely need editing are the handful of PL/pgSQL function
-- BODIES that hardcode a `public.<table>` string — those are literal SQL
-- text, re-resolved at call time, so a table that already moved out from
-- under a stale `public.<table>` reference would 404 at runtime otherwise.
--
-- What moves (11 tables + their domain-specific functions/triggers):
-- companies, company_accounts, company_memberships,
-- company_board_members, company_contacts, connectdex_applications,
-- connectdex_payments, connectdex_settings, products,
-- product_specifications, product_test_results.
--
-- What stays in `public`, deliberately — the Identity/Studio core that
-- will never be part of a ConnectDeX split: accounts, platform_staff,
-- studios, studio_memberships, licences, payments, plan_pricing,
-- platform_activity_log, support_tickets, password_reset_requests. Also
-- staying: `handle_new_platform_account()` (the one shared auth trigger
-- that creates EITHER an accounts row or a company_accounts row — it has
-- to see both schemas, so it can't move into either one) and
-- `new_public_id()` (the handle-minting utility, now used by both
-- domains — made schema-aware below via an optional parameter rather than
-- duplicated per-schema).
--
-- Two FKs deliberately keep crossing the new schema boundary, unchanged:
-- `companies.verified_by_id` and `connectdex_applications.reviewed_by_id`
-- both point at `accounts.id` (an admin's own Identity account, layered
-- with a `platform_staff` grant — not a Company identity). Postgres
-- allows cross-schema FKs within one database with no special handling;
-- this is also exactly the shape those two columns will keep even after
-- a genuine project-level split (a plain UUID with no live FK once the
-- schemas are in different databases).

create schema connectdex;

grant usage on schema connectdex to anon, authenticated, service_role;
grant all on all tables in schema connectdex to anon, authenticated, service_role;
grant all on all sequences in schema connectdex to anon, authenticated, service_role;
grant all on all functions in schema connectdex to anon, authenticated, service_role;
alter default privileges in schema connectdex grant all on tables to anon, authenticated, service_role;
alter default privileges in schema connectdex grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema connectdex grant all on functions to anon, authenticated, service_role;

-- Tables — OID-preserving move.
alter table public.companies set schema connectdex;
alter table public.company_accounts set schema connectdex;
alter table public.company_memberships set schema connectdex;
alter table public.company_board_members set schema connectdex;
alter table public.company_contacts set schema connectdex;
alter table public.connectdex_applications set schema connectdex;
alter table public.connectdex_payments set schema connectdex;
alter table public.connectdex_settings set schema connectdex;
alter table public.products set schema connectdex;
alter table public.product_specifications set schema connectdex;
alter table public.product_test_results set schema connectdex;

-- Domain-specific functions — same OID-preserving move for their trigger
-- attachments. Bodies with a hardcoded `public.<table>` string (only
-- is_company_owner, handle_new_company_owner_membership, handle_new_company,
-- and enforce_company_membership_update_invariants — the other 6 trigger
-- functions on these tables only touch NEW/OLD row fields and call the
-- unmoved public.log_platform_activity(), confirmed by reading every one
-- of their definitions before writing this migration) are re-created with
-- corrected bodies right after, since ALTER ... SET SCHEMA alone doesn't
-- touch function body text.
alter function public.is_company_owner(uuid) set schema connectdex;
alter function public.handle_new_company() set schema connectdex;
alter function public.handle_new_company_owner_membership() set schema connectdex;
alter function public.enforce_company_membership_update_invariants() set schema connectdex;
alter function public.log_company_status_update() set schema connectdex;
alter function public.log_connectdex_application_insert() set schema connectdex;
alter function public.log_connectdex_application_update() set schema connectdex;
alter function public.log_connectdex_payment_insert() set schema connectdex;
alter function public.log_connectdex_payment_update() set schema connectdex;

-- new_public_id gains an optional schema parameter (default 'public' —
-- every existing caller for studios/accounts is unaffected) instead of
-- being duplicated per schema. CREATE OR REPLACE does NOT replace the
-- original 2-arg signature here — Postgres treats a different arg count
-- as a distinct overload, not a replacement — so the old 2-arg version
-- must be dropped explicitly first, or every existing 2-arg call site
-- (studios, accounts) becomes ambiguous between the two overloads
-- ("function ... is not unique") the moment both exist at once. Caught
-- live: this exact ambiguity broke every new plain signup via
-- handle_new_platform_account() until the drop below was added.
drop function if exists public.new_public_id(text, text);

create or replace function public.new_public_id(p_prefix text, p_table text, p_schema text default 'public')
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
    execute format('select exists(select 1 from %I.%I where public_id = $1)', p_schema, p_table)
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

create or replace function connectdex.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable security definer set search_path = ''
as $$
  select exists (
    select 1 from connectdex.company_memberships
    where company_id = p_company_id
      and account_id = auth.uid()
      and role = 'OWNER'
      and status = 'ACTIVE'
  );
$$;

create or replace function connectdex.handle_new_company_owner_membership()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into connectdex.company_memberships (account_id, company_id, role, status, activated_at)
  values (new.owner_id, new.id, 'OWNER', 'ACTIVE', now());
  return new;
end;
$$;

create or replace function connectdex.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.public_id is null then
    new.public_id := public.new_public_id('AORMS-C-', 'companies', 'connectdex');
  end if;
  return new;
end;
$$;

create or replace function connectdex.enforce_company_membership_update_invariants()
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

  if connectdex.is_company_owner(old.company_id) then
    return new;
  end if;

  if new.role <> old.role or new.status <> 'LEFT' then
    raise exception 'company_memberships: self-service updates may only set status to LEFT (leaving) — role cannot be changed by anyone but the company owner';
  end if;

  return new;
end;
$$;

-- The one shared auth trigger — stays in public, now schema-aware for the
-- company_accounts branch (the accounts branch is unchanged).
create or replace function public.handle_new_platform_account()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', 'identity') = 'company' then
    insert into connectdex.company_accounts (id, full_name, public_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      public.new_public_id('AORMS-CU-', 'company_accounts', 'connectdex')
    );
  else
    insert into public.accounts (id, full_name, public_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      public.new_public_id('AORMS-U-', 'accounts')
    );
  end if;
  return new;
end;
$$;
