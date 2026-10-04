-- Demo accounts at every level of the hierarchy (2026-10-04).
--
-- The public demo used to be one login. This adds a roster — Owner, Partner, Senior, Accountant,
-- HR Manager, Associate, Viewer, and the three portal roles — so a visitor can sign in at any
-- level and see what that level can do. Source of truth for the UI/script is
-- web/lib/demo-accounts.json; a vitest test keeps the two in step.
--
-- This migration does NOT create auth.users rows (same rule as 0035: login creation goes through
-- the Auth admin API — see web/scripts/provision-demo-users.mjs). It only:
--   * records the roster,
--   * `sync_demo_accounts()` — for every roster email that already has a login, forces the
--     profile back to its roster role/name, enables it, puts it in the demo firm (the firm
--     demo@aorms.in belongs to), and links portal roles to a small "Portal Demo" client,
--     consultant+engagement and contractor,
--   * schedules that sync nightly, right after the existing reset, so a visitor who changed a
--     role, disabled someone or renamed an account finds everything restored the next day.
-- It never touches passwords (a visitor changing their own demo password is undone by re-running
-- the provisioning script).

create table if not exists public.demo_roster (
  email text primary key,
  full_name text not null,
  role public.app_role not null
);
alter table public.demo_roster enable row level security;
revoke all on public.demo_roster from anon, authenticated;

insert into public.demo_roster (email, full_name, role) values
  ('aditi.rao@aorms.in', 'Aditi Rao', 'OWNER'),
  ('vikram.shah@aorms.in', 'Vikram Shah', 'PARTNER'),
  ('akash.mehta@aorms.in', 'Akash Mehta', 'SENIOR'),
  ('rohan.desai@aorms.in', 'Rohan Desai', 'ACCOUNTANT'),
  ('demo.hr@aorms.in', 'Meena Iyer', 'HR_MANAGER'),
  ('priya.nair@aorms.in', 'Priya Nair', 'ASSOCIATE'),
  ('demo@aorms.in', 'AORMS Demo', 'VIEWER'),
  ('demo.client@aorms.in', 'Demo Client', 'CLIENT'),
  ('demo.consultant@aorms.in', 'Demo Consultant', 'CONSULTANT'),
  ('demo.contractor@aorms.in', 'Demo Contractor', 'CONTRACTOR')
on conflict (email) do update set full_name = excluded.full_name, role = excluded.role;

create or replace function public.sync_demo_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firm uuid;
  v_client uuid;
  v_consultant uuid;
  v_contractor uuid;
  v_project uuid;
  r record;
  v_n integer := 0;
begin
  -- The demo firm = the firm the long-standing demo@aorms.in login belongs to.
  select p.firm_id into v_firm
  from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'demo@aorms.in' limit 1;
  if v_firm is null then
    return 0;
  end if;

  -- Portal records (own name/ref prefixes, so reset_demo_data()'s "Demo — " / "DEMO-" wipes never touch them).
  select id into v_client from public.clients where firm_id = v_firm and name = 'Portal Demo — Client' limit 1;
  if v_client is null then
    insert into public.clients (name, kind, state, city, email, firm_id)
    values ('Portal Demo — Client', 'INDIVIDUAL', 'Karnataka', 'Bengaluru', 'portal.client.demo@example.com', v_firm)
    returning id into v_client;
  end if;

  select id into v_project from public.project_offices where firm_id = v_firm and ref = 'PORTAL-DEMO-01' limit 1;
  if v_project is null then
    insert into public.project_offices (ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start, firm_id)
    values ('PORTAL-DEMO-01', 'Portal Demo — Lakeview Residence', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE', v_client, 'Karnataka', 'Bengaluru', 12000000, current_date - 45, v_firm)
    returning id into v_project;
  end if;

  select id into v_consultant from public.consultants where firm_id = v_firm and name = 'Portal Demo — Consultant' limit 1;
  if v_consultant is null then
    insert into public.consultants (name, discipline, firm, email, firm_id)
    values ('Portal Demo — Consultant', 'Structural', 'Demo Structures LLP', 'portal.consultant.demo@example.com', v_firm)
    returning id into v_consultant;
  end if;
  if not exists (select 1 from public.engagements where consultant_id = v_consultant and project_id = v_project) then
    insert into public.engagements (project_id, consultant_id, scope, status, firm_id)
    values (v_project, v_consultant, 'Structural design and drawings', 'ACTIVE', v_firm);
  end if;

  select id into v_contractor from public.contractors where firm_id = v_firm and name = 'Portal Demo — Contractor' limit 1;
  if v_contractor is null then
    insert into public.contractors (name, category, company_name, email, firm_id)
    values ('Portal Demo — Contractor', 'Civil Contractor', 'Demo Constructions', 'portal.contractor.demo@example.com', v_firm)
    returning id into v_contractor;
  end if;

  for r in
    select d.email, d.full_name, d.role, u.id as uid
    from public.demo_roster d join auth.users u on u.email = d.email
  loop
    update public.profiles set
      role = r.role,
      full_name = r.full_name,
      disabled = false,
      firm_id = v_firm,
      client_id = case when r.role = 'CLIENT' then v_client else null end,
      consultant_id = case when r.role = 'CONSULTANT' then v_consultant else null end,
      contractor_id = case when r.role = 'CONTRACTOR' then v_contractor else null end
    where id = r.uid;

    insert into public.profile_firm_memberships (profile_id, firm_id, role, status)
    values (r.uid, v_firm, r.role, 'ACTIVE')
    on conflict (profile_id, firm_id) do update set role = excluded.role;

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

revoke all on function public.sync_demo_accounts() from public, anon, authenticated;

-- Nightly at 21:40 UTC (03:10 IST) — ten minutes after reset-demo-data (21:30).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-demo-accounts') then
    perform cron.unschedule('sync-demo-accounts');
  end if;
  perform cron.schedule('sync-demo-accounts', '40 21 * * *', $sql$select public.sync_demo_accounts()$sql$);
end;
$$;
