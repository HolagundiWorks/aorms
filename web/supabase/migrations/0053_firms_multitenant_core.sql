-- Multi-tenancy, Batch 1/12 — Core.
--
-- Converts the `firm` Postgres singleton into `firms` (one row per Studio),
-- adds `current_firm_id()` (mirrors `current_app_role()`, 0001), adds
-- `firm_id` to profiles/audit_log/clients/project_offices/phases/tasks, and
-- rewrites every RLS policy on those tables to add a firm_id check.
--
-- `profiles.firm_id` is deliberately NULLABLE, unlike every other table in
-- this migration (which get `not null default current_firm_id()`) — the
-- standard Supabase `handle_new_user()` trigger (0001) inserts a bare
-- `(id, full_name)` profiles row on every new auth.users signup, before
-- any firm is known. A NOT NULL firm_id here would break every signup
-- (chicken-and-egg: current_firm_id() itself reads profiles.firm_id). A
-- null firm_id is exactly the existing PENDING-role state: an account
-- that exists but belongs to no firm yet, until `provision_firm()` (a
-- later migration) or an explicit invite sets it. Every RLS policy below
-- that compares `firm_id = current_firm_id()` correctly returns zero rows
-- when either side is null (SQL NULL = NULL is unknown, not true), so a
-- firmless profile sees nothing and is seen by no firm's staff — safe by
-- construction, no special-casing needed.
--
-- Two pre-existing RLS gaps fixed in passing, found while touching these
-- exact policies (same class of bug as the memberships incident in root
-- CLAUDE.md: an UPDATE policy with a `using` clause but no `with_check`):
-- "profiles: owner manages", "clients: owner disables", and
-- "project_offices: staff update" all had no with_check. Once multiple
-- firms exist this would let an OWNER's UPDATE touch/re-home a row outside
-- their own firm; fixed by adding a matching with_check alongside the new
-- firm_id scoping on each.

-- ── 1. firm -> firms ────────────────────────────────────────────────────
alter table public.firm rename to firms;

alter table public.firms
  drop constraint firm_is_singleton,
  drop constraint firm_singleton_key,
  drop column singleton,
  add column created_at timestamptz not null default now(),
  add constraint firms_platform_studio_public_id_key unique (platform_studio_public_id);

-- ── 2. profiles.firm_id (nullable — see header) ────────────────────────
alter table public.profiles add column firm_id uuid references public.firms (id);

-- Exactly one firms row exists at this point (the renamed former
-- singleton) — every current profile belongs to it.
update public.profiles set firm_id = (select id from public.firms limit 1) where firm_id is null;

create index profiles_firm_id_idx on public.profiles (firm_id);

-- ── 3. current_firm_id() ────────────────────────────────────────────────
create function public.current_firm_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select firm_id from public.profiles where id = auth.uid();
$$;

-- ── 4. firms RLS ─────────────────────────────────────────────────────────
alter policy "firm: staff read" on public.firms
  using (public.is_office_staff() and id = public.current_firm_id());

alter policy "firm: owner/partner update" on public.firms
  using (public.current_app_role() = any (array['OWNER'::public.app_role, 'PARTNER'::public.app_role])
         and id = public.current_firm_id())
  with check (public.current_app_role() = any (array['OWNER'::public.app_role, 'PARTNER'::public.app_role])
              and id = public.current_firm_id());

-- ── 5. profiles RLS ──────────────────────────────────────────────────────
alter policy "profiles: staff read all" on public.profiles
  using (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "profiles: owner manages" on public.profiles
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());
-- "profiles: read own" (id = auth.uid()) is untouched — a user must always
-- be able to read their own row to bootstrap current_firm_id() itself.

-- ── 6. audit_log ─────────────────────────────────────────────────────────
alter table public.audit_log add column firm_id uuid references public.firms (id);
update public.audit_log set firm_id = (select id from public.firms limit 1);
alter table public.audit_log
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index audit_log_firm_id_idx on public.audit_log (firm_id);

alter policy "audit_log: staff read" on public.audit_log
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "audit_log: staff insert" on public.audit_log
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── 7. clients ───────────────────────────────────────────────────────────
alter table public.clients add column firm_id uuid references public.firms (id);
update public.clients set firm_id = (select id from public.firms limit 1);
alter table public.clients
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index clients_firm_id_idx on public.clients (firm_id);

alter policy "clients: own portal read" on public.clients
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and id = (select profiles.client_id from public.profiles where profiles.id = auth.uid()));

alter policy "clients: owner disables" on public.clients
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());

alter policy "clients: staff create" on public.clients
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "clients: staff read" on public.clients
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── 8. project_offices ───────────────────────────────────────────────────
alter table public.project_offices add column firm_id uuid references public.firms (id);
update public.project_offices set firm_id = (select id from public.firms limit 1);
alter table public.project_offices
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_offices_firm_id_idx on public.project_offices (firm_id);

alter policy "project_offices: consultant portal read" on public.project_offices
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and id in (select e.project_id from public.engagements e
                     where e.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));

alter policy "project_offices: own portal read" on public.project_offices
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid()));

alter policy "project_offices: staff create" on public.project_offices
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "project_offices: staff read" on public.project_offices
  using (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "project_offices: staff update" on public.project_offices
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── 9. phases ────────────────────────────────────────────────────────────
alter table public.phases add column firm_id uuid references public.firms (id);
update public.phases set firm_id = (select id from public.firms limit 1);
alter table public.phases
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index phases_firm_id_idx on public.phases (firm_id);

alter policy "phases: consultant portal read" on public.phases
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and project_id in (select e.project_id from public.engagements e
                              where e.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));

alter policy "phases: own portal read" on public.phases
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

alter policy "phases: staff read" on public.phases
  using (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "phases: staff write" on public.phases
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── 10. tasks ────────────────────────────────────────────────────────────
alter table public.tasks add column firm_id uuid references public.firms (id);
update public.tasks set firm_id = (select id from public.firms limit 1);
alter table public.tasks
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index tasks_firm_id_idx on public.tasks (firm_id);

alter policy "tasks: staff read" on public.tasks
  using (public.is_office_staff() and firm_id = public.current_firm_id());

alter policy "tasks: staff write" on public.tasks
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
