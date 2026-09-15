-- Landing-page-aligned demo examples (2026-09-15) — closes a real
-- cross-verification gap: the marketing site's illustrative examples
-- (Sharma Residence Extension's kitchen finish revision, Mehta
-- Bungalow's 65% working drawings, Verma Residence/Reddy Extension
-- overdue invoices) existed only as hardcoded constants in landing-page
-- components (BillingForecastPanel.tsx, RevisionLifecyclePanel.tsx,
-- marketing-content.ts's PULSE_SECTION.sampleBrief) — none of those
-- names or figures existed anywhere in the real demo account a visitor
-- actually signs into (the real demo seed uses a wholly different name
-- set — Aurelia Residences, Rao Family Residence, etc.)
--
-- Kept as its own function, deliberately separate from reset_demo_data()
-- (migrations 0035/0041/0042's 580+ line function) — editing that
-- function directly would mean pasting its entire existing body into a
-- new migration just to add one call, with no local Supabase stack to
-- verify the result against before it runs live against production.
-- Same fixed 5 demo staff accounts, same ref/name-prefix delete-then-
-- insert idempotency pattern, own pg_cron schedule five minutes after
-- reset-demo-data's so the two never run concurrently against
-- clients/decisions/invoices.

create or replace function public.seed_landing_page_demo_examples()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owner_id uuid;
  v_senior_id uuid;
begin
  select p.id into v_owner_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'aditi.rao@aorms.in' limit 1;
  select p.id into v_senior_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'akash.mehta@aorms.in' limit 1;

  -- Not an error: safe to call (and scheduled nightly) before the demo
  -- staff accounts exist yet — same guard reset_demo_data() itself uses.
  if v_owner_id is null or v_senior_id is null then
    return;
  end if;

  -- ── Wipe previous run's rows — own ref/name prefixes, isolated from
  --     reset_demo_data()'s own DEMO-PRJ-%/DEMO-%/"Demo — "% patterns,
  --     so the two functions never delete each other's rows. ──────────
  delete from public.decisions where project_id in (select id from public.project_offices where ref like 'DEMO-LP-%');
  delete from public.progress_reports where project_id in (select id from public.project_offices where ref like 'DEMO-LP-%');
  delete from public.invoices where ref like 'DEMO-LPINV-%';
  delete from public.phases where project_id in (select id from public.project_offices where ref like 'DEMO-LP-%');
  delete from public.project_offices where ref like 'DEMO-LP-%';
  delete from public.clients where name like 'Landing Example — %';

  -- ── Clients ──────────────────────────────────────────────────────
  insert into public.clients (name, kind, state, city, email, phone, gstin) values
    ('Landing Example — Ravi & Kavita Sharma', 'INDIVIDUAL', 'Karnataka', 'Bengaluru', 'sharma.example@example.com', '+91 90000 10001', null),
    ('Landing Example — Vinod & Anita Mehta', 'INDIVIDUAL', 'Karnataka', 'Bengaluru', 'mehta.example@example.com', '+91 90000 10002', null),
    ('Landing Example — Deepak Verma', 'INDIVIDUAL', 'Karnataka', 'Mysuru', 'verma.example@example.com', '+91 90000 10003', null),
    ('Landing Example — Reddy Family', 'INDIVIDUAL', 'Telangana', 'Hyderabad', 'reddy.example@example.com', '+91 90000 10004', null);

  -- ── Projects — the exact names the landing page's illustrative
  --     examples use. ──────────────────────────────────────────────────
  insert into public.project_offices (ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start, created_by_id) values
    ('DEMO-LP-01', 'Sharma Residence Extension', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Landing Example — Ravi & Kavita Sharma'), 'Karnataka', 'Bengaluru', 24000000, current_date - 90, v_owner_id),
    ('DEMO-LP-02', 'Mehta Bungalow', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Landing Example — Vinod & Anita Mehta'), 'Karnataka', 'Bengaluru', 38000000, current_date - 60, v_senior_id),
    ('DEMO-LP-03', 'Verma Residence', 'Residential', 'ARCHITECTURE', 'OTHER', 'ACTIVE',
      (select id from public.clients where name = 'Landing Example — Deepak Verma'), 'Karnataka', 'Mysuru', 19000000, current_date - 150, v_owner_id),
    ('DEMO-LP-04', 'Reddy Extension', 'Residential', 'ARCHITECTURE', 'OTHER', 'ACTIVE',
      (select id from public.clients where name = 'Landing Example — Reddy Family'), 'Telangana', 'Hyderabad', 21000000, current_date - 130, v_senior_id);

  -- ── Sharma Residence Extension: the kitchen finish revision, with a
  --     real cost delta (migration 0051) — echoes RevisionLifecyclePanel.
  --     tsx's illustrative "+₹18,500" exactly (1,850,000 paise). ───────
  insert into public.phases (project_id, code, label, billing_pct, sort_order) values
    ((select id from public.project_offices where ref = 'DEMO-LP-01'), 'DD', 'Design Development', 30, 2);

  insert into public.decisions (project_id, title, rationale, state, revision_category, revision_source, impact, owner_name, cost_delta_paise, created_by_id) values
    ((select id from public.project_offices where ref = 'DEMO-LP-01'), 'Kitchen finish revision',
      'Client requested a change from laminate to solid-surface countertops and a revised backsplash finish after the design development walkthrough — approved with an added fee for the material and coordination cost.',
      'ACCEPTED', 'MINOR', 'CLIENT_DRIVEN', 'LOW', 'Ar. Aditi Rao', 1850000, v_owner_id);

  -- ── Mehta Bungalow: working drawings at 65% — echoes marketing-
  --     content.ts's PULSE_SECTION.sampleBrief exactly. ────────────────
  insert into public.progress_reports (project_id, period_start, period_end, narrative, physical_progress_pct, schedule_progress_pct, status, created_by_id) values
    ((select id from public.project_offices where ref = 'DEMO-LP-02'), current_date - 14, current_date,
      'Working drawings progressing on schedule; on track for the client review this week.', 65, 65, 'ISSUED', v_senior_id);

  -- ── Verma Residence / Reddy Extension: overdue invoices — echoes
  --     marketing-content.ts's PULSE_SECTION.sampleBrief exactly. ──────
  insert into public.invoices (ref, project_id, client_id, status, gst_system, document_kind, inter_state, tds_applicable, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, tds_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice) values
    ('DEMO-LPINV-01', (select id from public.project_offices where ref = 'DEMO-LP-03'), (select id from public.clients where name = 'Landing Example — Deepak Verma'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 9500000, 855000, 855000, 0, 1710000, 0, 11210000, 11210000, 0, current_date - 9),
    ('DEMO-LPINV-02', (select id from public.project_offices where ref = 'DEMO-LP-04'), (select id from public.clients where name = 'Landing Example — Reddy Family'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', true, false, 8400000, 0, 0, 1512000, 1512000, 0, 9912000, 9912000, 0, current_date - 8);
end;
$function$;

comment on function public.seed_landing_page_demo_examples() is
  'Real demo rows matching the landing page''s own illustrative examples (Sharma Residence Extension, Mehta Bungalow, Verma Residence, Reddy Extension) — kept independent of reset_demo_data() (migrations 0035/0041/0042), same ref-prefix idempotency pattern, own pg_cron schedule.';

-- Same nightly hour as reset-demo-data, five minutes later so the two
-- functions never run concurrently against the same tables.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'seed-landing-page-demo-examples') then
    perform cron.unschedule('seed-landing-page-demo-examples');
  end if;
  perform cron.schedule('seed-landing-page-demo-examples', '35 21 * * *', $sql$select public.seed_landing_page_demo_examples()$sql$);
end;
$$;

-- Run once now so this migration's own live verification (and anyone
-- opening the demo account before 21:35 UTC tonight) sees these rows
-- immediately rather than waiting for tomorrow's cron run.
select public.seed_landing_page_demo_examples();
