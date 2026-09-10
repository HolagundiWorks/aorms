-- Public demo account + nightly reset (2026-09-10). Explicit direction:
-- a demo a prospect can explore live, scoped to the Office Hub app
-- (clients/projects/tasks/invoices/leads), reset on a schedule so one
-- visitor's poking around doesn't leave stale/weird state for the next.
--
-- The demo LOGIN ITSELF is not created here — creating an auth.users row
-- directly via SQL is a sensitive write this session's own auto-mode
-- classifier already blocked once (for a *different* auth.users edit);
-- the account is created the normal way, by the firm owner, through the
-- existing /users invite flow, with role = VIEWER. This migration only
-- builds the DATA side: a reset function that looks the demo profile up
-- by a well-known email at execution time (not a hardcoded id, so this
-- works correctly whenever the account actually gets created) and a
-- pg_cron schedule that runs it nightly.
--
-- Role choice matters for safety, not just UX: VIEWER is rank 20 in
-- capability_rank() (supabase/migrations/0002_capability_helper.sql),
-- below the 'write' capability's threshold of 40 — a VIEWER genuinely
-- cannot create/edit/delete anything, enforced by RLS, not just hidden
-- buttons. That means a public demo visitor can't damage real data even
-- if the reset job's own schedule has a gap, and the reset job's *only*
-- real job is undoing accumulated visual clutter (e.g. a demo task's
-- status), not preventing actual harm — the account itself already does
-- that by construction.
--
-- Demo rows are tagged with a fixed, unmistakable marker so the reset can
-- find (and only ever touch) its own data: 'DEMO-' prefixed `ref`s on
-- tables that have one (invoices, project_offices, leads), 'Demo — '
-- prefixed human-readable names elsewhere (clients.name, tasks.title).
-- Deletes run children-before-parents (invoices/tasks -> project_offices
-- -> clients; leads are independent) to respect FK constraints with no
-- ON DELETE CASCADE from these tables.

create extension if not exists pg_cron;

create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_demo_id uuid;
  v_client1_id uuid;
  v_client2_id uuid;
  v_project1_id uuid;
  v_project2_id uuid;
begin
  select p.id into v_demo_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'demo@aorms.in'
  limit 1;

  -- Not an error: safe to call (and scheduled nightly) before the demo
  -- account has actually been created yet.
  if v_demo_id is null then
    return;
  end if;

  delete from public.invoices where ref like 'DEMO-%';
  delete from public.tasks where title like 'Demo — %';
  delete from public.project_offices where ref like 'DEMO-%';
  delete from public.leads where ref like 'DEMO-%';
  delete from public.clients where name like 'Demo — %';

  insert into public.clients (id, name, kind, state, city, email, phone)
  values (gen_random_uuid(), 'Demo — Aurelia Residences', 'COMPANY', 'Karnataka', 'Bengaluru', 'contact@demo-aurelia.example', '+91 90000 00001')
  returning id into v_client1_id;

  insert into public.clients (id, name, kind, state, city, email, phone)
  values (gen_random_uuid(), 'Demo — Meera & Arjun Rao', 'INDIVIDUAL', 'Karnataka', 'Hubballi', 'meera.demo@example.com', '+91 90000 00002')
  returning id into v_client2_id;

  insert into public.project_offices (id, ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start)
  values (gen_random_uuid(), 'DEMO-PRJ-01', 'Demo — Aurelia Residences Phase 1', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE', v_client1_id, 'Karnataka', 'Bengaluru', 8500000000, current_date - interval '90 days')
  returning id into v_project1_id;

  insert into public.project_offices (id, ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start)
  values (gen_random_uuid(), 'DEMO-PRJ-02', 'Demo — Rao Family Residence', 'Residential', 'ARCHITECTURE', 'OTHER', 'ENQUIRY', v_client2_id, 'Karnataka', 'Hubballi', 1800000000, current_date - interval '10 days')
  returning id into v_project2_id;

  insert into public.tasks (title, project_id, status, priority, due_date) values
    ('Demo — Concept design review', v_project1_id, 'IN_PROGRESS', 'HIGH', current_date + 3),
    ('Demo — Structural coordination', v_project1_id, 'TODO', 'MEDIUM', current_date + 10),
    ('Demo — Working drawings — GF plan', v_project1_id, 'DONE', 'MEDIUM', current_date - 5),
    ('Demo — Site visit report', v_project1_id, 'BLOCKED', 'HIGH', current_date - 1),
    ('Demo — Client brief follow-up', v_project2_id, 'TODO', 'LOW', current_date + 14);

  insert into public.leads (id, ref, client_name, lead_source, project_type, city, status)
  values (gen_random_uuid(), 'DEMO-LEAD-01', 'Demo — Kavya Interiors Enquiry', 'Website', 'Interior', 'Bengaluru', 'CONTACTED');

  -- REGULAR/18% matching the real firm's own configured gst_type, kept
  -- deliberately simple (intra-state, no TDS, no advance/retention) --
  -- this is demo content, not a worked GST-compliance example; the blog
  -- post on GST/TDS covers that complexity in prose instead.
  insert into public.invoices (
    ref, project_id, client_id, status, gst_system, document_kind,
    inter_state, tds_applicable, taxable_paise, cgst_paise, sgst_paise,
    gst_total_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice
  ) values (
    'DEMO-INV-01', v_project1_id, v_client1_id, 'ISSUED', 'REGULAR', 'TAX_INVOICE',
    false, false, 50000000, 4500000, 4500000,
    9000000, 59000000, 59000000, 0, current_date - 15
  );
end;
$$;

-- Nightly at 21:30 UTC = 03:00 IST — a low-traffic hour, matching this
-- app's India-first user base. unschedule-then-schedule (in an explicit
-- DO block, not a bare `select f() where exists(...)` — that pattern's
-- evaluation order for a side-effecting function isn't something to rely
-- on) so re-running this migration doesn't error on a duplicate job name.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reset-demo-data') then
    perform cron.unschedule('reset-demo-data');
  end if;
  perform cron.schedule('reset-demo-data', '30 21 * * *', $sql$select public.reset_demo_data()$sql$);
end;
$$;
