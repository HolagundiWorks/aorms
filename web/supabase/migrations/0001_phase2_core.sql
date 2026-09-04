-- AORMS Phase 2 — Core ERP: profiles, audit log, firm, clients, projects, tasks.
-- Single-tenant per deployment (decided 2026-09-04, see
-- docs/esti/NEXTJS-MIGRATION-PHASE2-AUDIT.md) — no org_id/tenant column
-- anywhere; RLS is scoped by auth.uid() + role only.
--
-- Landing order matches the audit's suggested sequence: profiles → audit_log
-- → firm → clients → project_offices/phases → tasks. Table/column names are
-- new (no esti_ prefix, snake_case matching Supabase convention) — this is a
-- fresh schema, not a literal port of the esti_* tables.

-- ── Role model ────────────────────────────────────────────────────────────
-- Mirrors packages/contracts/src/permissions.ts StaffRole, plus the portal
-- roles (CLIENT/CONSULTANT/CONTRACTOR) that already exist on esti_user.role.
create type public.app_role as enum (
  'OWNER', 'PARTNER', 'ACCOUNTANT', 'HR_MANAGER', 'SENIOR', 'ASSOCIATE',
  'VIEWER', 'SITE_SUPERVISOR', 'CONSULTANT', 'CLIENT', 'CONTRACTOR'
);

-- ── profiles ──────────────────────────────────────────────────────────────
-- 1:1 with auth.users. App-level identity data stays separate from the auth
-- record itself, per the migration spec's §16 pattern.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'ASSOCIATE',
  disabled boolean not null default false,
  -- Portal-scoping FKs (mirrors esti_user.clientId/consultantId/contractorId).
  -- References added once the client_id FK target (public.clients) exists
  -- below; consultant_id/contractor_id stay plain uuid until those tables
  -- land in a later phase.
  client_id uuid,
  consultant_id uuid,
  contractor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile row whenever a new auth.users row appears (standard
-- Supabase pattern — Server Actions never insert into auth.users directly).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current user's role, used by every other table's RLS below.
-- STABLE + security definer so it can read profiles regardless of the
-- calling policy's own RLS (avoids recursive-policy issues on profiles
-- itself).
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_office_staff()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.current_app_role() in (
    'OWNER', 'PARTNER', 'ACCOUNTANT', 'HR_MANAGER', 'SENIOR', 'ASSOCIATE', 'VIEWER'
  );
$$;

-- Profiles: everyone can read their own row; office staff can read every
-- profile (needed for assignee pickers etc.); only OWNER can change roles or
-- disable a user (mirrors ownerProcedure-gated users.setRole/setDisabled).
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: staff read all" on public.profiles
  for select using (public.is_office_staff());
create policy "profiles: owner manages" on public.profiles
  for update using (public.current_app_role() = 'OWNER');

-- ── audit_log ─────────────────────────────────────────────────────────────
-- Mirrors esti_audit — append-only, every domain's mutations write here.
-- Port the writeAudit() helper as a Postgres function so both Server Actions
-- and any future direct-SQL paths get the same guarantee.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.profiles (id),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log: staff read" on public.audit_log
  for select using (public.is_office_staff());
-- Insert-only for authenticated staff — no update/delete policy exists, so
-- the table is append-only by construction (RLS defaults to deny).
create policy "audit_log: staff insert" on public.audit_log
  for insert with check (public.is_office_staff());

create function public.write_audit(
  p_entity text, p_entity_id uuid, p_action text,
  p_before jsonb default null, p_after jsonb default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.audit_log (entity, entity_id, action, actor_id, before, after)
  values (p_entity, p_entity_id, p_action, auth.uid(), p_before, p_after);
$$;

-- ── firm ──────────────────────────────────────────────────────────────────
-- Single-row firm profile (mirrors esti_firm). A check constraint pins it to
-- exactly one row rather than relying on application discipline.
create table public.firm (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  company_name text not null default '',
  firm_type text not null default 'SOLO',
  gst_type text not null default 'REGULAR',
  gstin text,
  pan text,
  architect_name text,
  coa_reg_no text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  pincode text,
  district text,
  state text,
  updated_at timestamptz not null default now(),
  constraint firm_is_singleton check (singleton)
);

alter table public.firm enable row level security;

create policy "firm: staff read" on public.firm
  for select using (public.is_office_staff());
create policy "firm: owner/partner update" on public.firm
  for update using (public.current_app_role() in ('OWNER', 'PARTNER'));

-- ── clients ───────────────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  name text not null,
  kind text not null default 'INDIVIDUAL'
    check (kind in ('INDIVIDUAL', 'COMPANY', 'ARCHITECT_FIRM')),
  gstin text,
  pan text,
  state text,
  city text,
  email text,
  phone text,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients: staff read" on public.clients
  for select using (public.is_office_staff());
create policy "clients: staff create" on public.clients
  for insert with check (public.is_office_staff());
create policy "clients: owner disables" on public.clients
  for update using (public.current_app_role() = 'OWNER');

-- Now that public.clients exists, wire profiles.client_id to it (portal
-- users scoped to a single client record).
alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete set null;

-- Client-portal users can read their own client record (mirrors the CLIENT
-- role's scoping via esti_user.clientId).
create policy "clients: own portal read" on public.clients
  for select using (
    public.current_app_role() = 'CLIENT'
    and id = (select client_id from public.profiles where id = auth.uid())
  );

-- ── project_offices + phases ─────────────────────────────────────────────
create table public.project_offices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  title text not null,
  project_type text not null,
  work_type text not null default 'ARCHITECTURE'
    check (work_type in ('ARCHITECTURE', 'INTERIOR', 'LANDSCAPE', 'MISC')),
  jurisdiction text not null default 'OTHER',
  status text not null default 'ENQUIRY',
  client_id uuid references public.clients (id),
  state text,
  district text,
  city text,
  pin text,
  site_address text,
  site_area_sqm double precision,
  contract_value_paise bigint not null default 0,
  date_start date,
  created_by_id uuid references public.profiles (id),
  archived_at timestamptz,
  archived_by_id uuid references public.profiles (id),
  current_phase_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_offices enable row level security;

create policy "project_offices: staff read" on public.project_offices
  for select using (public.is_office_staff());
create policy "project_offices: staff create" on public.project_offices
  for insert with check (public.is_office_staff());
create policy "project_offices: staff update" on public.project_offices
  for update using (public.is_office_staff());

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  code text not null,
  label text not null,
  billing_pct integer not null default 0,
  sort_order integer not null default 0,
  revision_budget integer,
  created_at timestamptz not null default now()
);

alter table public.phases enable row level security;

create policy "phases: staff read" on public.phases
  for select using (public.is_office_staff());
create policy "phases: staff write" on public.phases
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- Now that public.project_offices exists, wire its self-referencing FK.
alter table public.project_offices
  add constraint project_offices_current_phase_id_fkey
  foreign key (current_phase_id) references public.phases (id) on delete set null;

-- ── tasks ─────────────────────────────────────────────────────────────────
-- assignee_id/reviewer_id reference profiles directly for now (the audit
-- flagged the current system's teamMembers indirection as a Phase-2 open
-- question — deferred until HR/roster is actually scoped, so this points
-- straight at profiles until then).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references public.project_offices (id) on delete set null,
  assignee_id uuid references public.profiles (id),
  reviewer_id uuid references public.profiles (id),
  depends_on_id uuid references public.tasks (id) on delete set null,
  classification text,
  work_type text,
  difficulty_coefficient smallint default 3,
  estimated_hours numeric(6, 2),
  status text not null default 'TODO',
  priority text not null default 'MEDIUM',
  due_date date,
  start_date date,
  created_by_id uuid references public.profiles (id),
  completed_at timestamptz,
  intervention_required boolean not null default false,
  priority_score integer not null default 0,
  confidence_score integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks: staff read" on public.tasks
  for select using (public.is_office_staff());
create policy "tasks: staff write" on public.tasks
  for all using (public.is_office_staff()) with check (public.is_office_staff());
