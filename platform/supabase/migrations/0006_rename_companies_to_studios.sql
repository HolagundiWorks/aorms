-- Rename "Company" (architecture firms) -> "Studio", freeing "Company" up
-- for a genuinely new entity: material supplier companies (see the
-- Studio/Company split + Material Catalogue plan). Confirmed with the
-- user: a FULL rename (schema + code), not a UI-only relabel, since a
-- real supplier "Company" is about to exist alongside this table and
-- "company" silently meaning two different things (Studio internally,
-- supplier user-facing) would be a lasting confusion source.
--
-- Table/column renames (`alter table/column ... rename to ...`) are safe
-- and complete on their own: RLS policy USING/WITH CHECK clauses and FK/
-- unique constraints are stored as compiled expression trees bound by
-- attnum/OID, not text, so Postgres's dependency tracking updates them
-- transparently — confirmed, no policy needs its expression rewritten,
-- only (optionally, done below for clarity) its display NAME.
-- `language sql` functions (`is_company_owner`) get the same automatic
-- treatment, so a plain `ALTER FUNCTION ... RENAME TO ...` is enough.
-- `language plpgsql` functions do NOT get this treatment (their bodies
-- are opaque text resolved fresh at each call, no dependency tracking) —
-- those are dropped and recreated below with corrected bodies, or their
-- next invocation would fail with "relation public.companies does not
-- exist".
--
-- No production data exists yet (dev-only, confirmed standing project
-- constraint) — straight renames, no backfill/dual-write period needed.

-- ── 1. Rename tables ─────────────────────────────────────────────────────
alter table public.companies rename to studios;
alter table public.memberships rename to studio_memberships;
alter table public.company_board_members rename to studio_board_members;
alter table public.company_contacts rename to studio_contacts;

-- ── 2. Rename columns ────────────────────────────────────────────────────
alter table public.studio_memberships rename column company_id to studio_id;
alter table public.studio_board_members rename column company_id to studio_id;
alter table public.studio_contacts rename column company_id to studio_id;
alter table public.licences rename column company_id to studio_id;

-- ── 3. Drop triggers + plpgsql functions that need their bodies rewritten ─
drop trigger before_company_insert on public.studios;
drop trigger after_company_insert on public.studios;
drop trigger after_company_insert_licence on public.studios;
drop trigger before_membership_update on public.studio_memberships;

drop function public.handle_new_company();
drop function public.handle_new_company_owner_membership();
drop function public.handle_new_company_licence();
drop function public.enforce_membership_update_invariants();

-- ── 4. `language sql` function ────────────────────────────────────────────
-- CORRECTION (caught by testing this migration live before it ever
-- shipped, not assumed): unlike RLS policies/views/check constraints —
-- genuinely stored as bound expression trees that DO auto-update on
-- rename — a function's body (`pg_proc.prosrc`) is stored as literal
-- TEXT for every PL, `language sql` included; dependency tracking there
-- only blocks a DROP without CASCADE, it does not rewrite the stored
-- text. A bare `ALTER FUNCTION ... RENAME TO ...` alone left this
-- function's body still calling `public.memberships`, which broke at
-- the very next invocation (`relation "public.memberships" does not
-- exist"). Renaming AND replacing the body in the same step.
alter function public.is_company_owner(uuid) rename to is_studio_owner;

-- Parameter stays named p_company_id: CREATE OR REPLACE cannot rename a
-- parameter (SQLSTATE 42P13, hit live), only DROP+CREATE could, and that
-- would require dropping every policy that already calls this function
-- by OID first. Purely cosmetic either way — callers pass positionally.
create or replace function public.is_studio_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.studio_memberships
    where studio_id = p_company_id
      and account_id = auth.uid()
      and role = 'OWNER'
      and status = 'ACTIVE'
  );
$$;

-- ── 5. Recreate the plpgsql functions under new names, corrected bodies ──
-- The public-ID prefix changes from AORMS-C- to AORMS-S- here — this is
-- the only place a Studio's handle prefix is decided.
create function public.handle_new_studio()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.public_id is null then
    new.public_id := public.new_public_id('AORMS-S-', 'studios');
  end if;
  return new;
end;
$$;

create trigger before_studio_insert
  before insert on public.studios
  for each row execute function public.handle_new_studio();

create function public.handle_new_studio_owner_membership()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.studio_memberships (account_id, studio_id, role, status, activated_at)
  values (new.owner_id, new.id, 'OWNER', 'ACTIVE', now());
  return new;
end;
$$;

create trigger after_studio_insert
  after insert on public.studios
  for each row execute function public.handle_new_studio_owner_membership();

create function public.handle_new_studio_licence()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.licences (studio_id, plan, seats, expires_at)
  values (new.id, 'TRIAL', 1, now() + interval '30 days');
  return new;
end;
$$;

create trigger after_studio_insert_licence
  after insert on public.studios
  for each row execute function public.handle_new_studio_licence();

create function public.enforce_studio_membership_update_invariants()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.account_id <> old.account_id or new.studio_id <> old.studio_id then
    raise exception 'studio_memberships: account_id and studio_id cannot be changed after creation';
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_studio_owner(old.studio_id) then
    return new;
  end if;

  if new.role <> old.role or new.status <> 'LEFT' then
    raise exception 'studio_memberships: self-service updates may only set status to LEFT (leaving) — role cannot be changed by anyone but the studio owner';
  end if;

  return new;
end;
$$;

create trigger before_studio_membership_update
  before update on public.studio_memberships
  for each row execute function public.enforce_studio_membership_update_invariants();

-- ── 6. Rename RLS policies for clarity (expressions already correct — see
-- header note; this only renames each policy's own display label) ────────
alter policy "companies: authenticated read" on public.studios rename to "studios: authenticated read";
alter policy "companies: self insert" on public.studios rename to "studios: self insert";
alter policy "companies: owner update" on public.studios rename to "studios: owner update";

alter policy "memberships: self read" on public.studio_memberships rename to "studio_memberships: self read";
alter policy "memberships: company owner reads all" on public.studio_memberships rename to "studio_memberships: studio owner reads all";
alter policy "memberships: self insert" on public.studio_memberships rename to "studio_memberships: self insert";
alter policy "memberships: owner insert (invite)" on public.studio_memberships rename to "studio_memberships: owner insert (invite)";
alter policy "memberships: self update (leave)" on public.studio_memberships rename to "studio_memberships: self update (leave)";
alter policy "memberships: owner update" on public.studio_memberships rename to "studio_memberships: owner update";

alter policy "company_board_members: members read" on public.studio_board_members rename to "studio_board_members: members read";
alter policy "company_board_members: owner writes" on public.studio_board_members rename to "studio_board_members: owner writes";

alter policy "company_contacts: members read" on public.studio_contacts rename to "studio_contacts: members read";
alter policy "company_contacts: owner writes" on public.studio_contacts rename to "studio_contacts: owner writes";

alter policy "licences: members read" on public.licences rename to "licences: studio members read";
