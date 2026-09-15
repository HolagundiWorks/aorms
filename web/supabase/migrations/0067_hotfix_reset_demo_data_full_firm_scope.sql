-- HOTFIX — reset_demo_data() full firm-scoped rewrite.
--
-- 0056 only patched the syntax-breaking `firm`/`singleton` reference. This
-- function is `security definer`, invoked nightly by pg_cron with no
-- session (auth.uid() resolves null there, same as any other service-role
-- caller) — so every one of its ~40 inserts across batches 1-12's newly
-- firm_id-NOT-NULL tables would fail outright, and its deletes/the one
-- update had no firm scoping at all. Resolves the demo firm's own
-- firm_id once (via the already-existing v_owner_id lookup) and threads
-- it through every statement: `and firm_id = v_firm_id` on every delete,
-- `where id = v_firm_id` on the firms update, and an explicit `firm_id`
-- column + value on every insert (appended at the end of each column
-- list/tuple rather than inserted mid-list, to keep the diff mechanical
-- and reduce the chance of a transcription error in a real production
-- function covering invoice/GST/task data).

create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owner_id uuid;
  v_partner_id uuid;
  v_senior_id uuid;
  v_associate_id uuid;
  v_accountant_id uuid;
  v_firm_id uuid;
begin
  select p.id into v_owner_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'aditi.rao@aorms.in' limit 1;
  select p.id into v_partner_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'vikram.shah@aorms.in' limit 1;
  select p.id into v_senior_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'akash.mehta@aorms.in' limit 1;
  select p.id into v_associate_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'priya.nair@aorms.in' limit 1;
  select p.id into v_accountant_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'rohan.desai@aorms.in' limit 1;

  -- Not an error: safe to call (and scheduled nightly) before the 5
  -- staff accounts have actually been created yet.
  if v_owner_id is null or v_partner_id is null or v_senior_id is null or v_associate_id is null or v_accountant_id is null then
    return;
  end if;

  -- Multi-tenancy (migration 0053+) — resolve the demo firm's own id once;
  -- every statement below is scoped to it explicitly, since this function
  -- runs with no session for RLS/column defaults to key off of.
  select firm_id into v_firm_id from public.profiles where id = v_owner_id;
  if v_firm_id is null then
    return;
  end if;

  -- ── Firm profile ──────────────────────────────────────────────────
  update public.firms set
    company_name = 'Aurelia Design Collective',
    firm_type = 'PARTNERSHIP',
    gst_type = 'REGULAR',
    gstin = '29AAJCA1234F1Z5',
    architect_name = 'Ar. Aditi Rao',
    coa_reg_no = 'CA/2009/45231',
    email = 'studio@aorms.in',
    phone = '+91 80 4000 1234',
    address_line1 = '4th Floor, Prestige Tech Park',
    address_line2 = 'Kadubeesanahalli',
    city = 'Bengaluru',
    district = 'Bengaluru Urban',
    state = 'Karnataka',
    pincode = '560103',
    tds_applicable_default = true
  where id = v_firm_id;

  -- ── Wipe previous demo rows (widened prefixes/name patterns) ───────
  delete from public.task_missing_params where task_id in (select id from public.tasks where title like 'Demo — %') and firm_id = v_firm_id;
  delete from public.task_dependencies where (task_id in (select id from public.tasks where title like 'Demo — %') or depends_on_task_id in (select id from public.tasks where title like 'Demo — %')) and firm_id = v_firm_id;
  delete from public.task_priority_log where task_id in (select id from public.tasks where title like 'Demo — %') and firm_id = v_firm_id;
  delete from public.esti_embeddings where source_id in (
    select id from public.moms where ref like 'DEMO-%'
    union select id from public.progress_reports where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%')
    union select id from public.decisions where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%')
  ) and firm_id = v_firm_id;
  delete from public.moms where ref like 'DEMO-%' and firm_id = v_firm_id;
  delete from public.progress_reports where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%') and firm_id = v_firm_id;
  delete from public.decisions where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%') and firm_id = v_firm_id;
  delete from public.proposals where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%') and firm_id = v_firm_id;
  delete from public.invoices where ref like 'DEMO-%' and firm_id = v_firm_id;
  delete from public.tasks where title like 'Demo — %' and firm_id = v_firm_id;
  delete from public.leads where ref like 'DEMO-%' and firm_id = v_firm_id;
  delete from public.project_offices where ref like 'DEMO-PRJ-%' and firm_id = v_firm_id;
  delete from public.clients where name like 'Demo — %' and firm_id = v_firm_id;
  delete from public.contractors where name like 'Demo — %' and firm_id = v_firm_id;
  delete from public.consultants where name like 'Demo — %' and firm_id = v_firm_id;
  delete from public.leaves where team_member_id in (select id from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id)) and firm_id = v_firm_id;
  delete from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id) and firm_id = v_firm_id;

  -- ── Team members (HR side — leaves/payroll read this, not profiles).
  --     `role` here is a free-text designation (NewTeamMemberForm's own
  --     placeholder is "e.g. Senior Architect"), not the profiles.role
  --     app_role enum — the two are deliberately different vocabularies.
  insert into public.team_members (name, role, employment_type, email, monthly_salary_paise, date_joined, active, user_id, job_title, firm_id) values
    ('Ar. Aditi Rao', 'Principal Architect', 'FULL_TIME', 'aditi.rao@aorms.in', 25000000, '2018-04-01', true, v_owner_id, 'Principal Architect', v_firm_id),
    ('Ar. Vikram Shah', 'Partner', 'FULL_TIME', 'vikram.shah@aorms.in', 20000000, '2019-06-15', true, v_partner_id, 'Partner', v_firm_id),
    ('Ar. Akash Mehta', 'Senior Architect', 'FULL_TIME', 'akash.mehta@aorms.in', 12000000, '2021-01-10', true, v_senior_id, 'Senior Architect', v_firm_id),
    ('Priya Nair', 'Associate Architect', 'FULL_TIME', 'priya.nair@aorms.in', 7500000, '2023-07-01', true, v_associate_id, 'Associate Architect', v_firm_id),
    ('Rohan Desai', 'Accounts & Compliance', 'FULL_TIME', 'rohan.desai@aorms.in', 6500000, '2022-03-20', true, v_accountant_id, 'Accounts & Compliance', v_firm_id);

  -- Ar. Akash Mehta is on approved leave today, every day this runs —
  -- matches the landing page's own placeholder copy ("Ar Akash is on
  -- leave today") and exercises the dashboard's Team Availability
  -- widget / Daily Brief with a real row, not an invented one.
  insert into public.leaves (team_member_id, type, from_date, to_date, days, reason, status, firm_id)
  select id, 'CASUAL', current_date, current_date, 1, 'Family function', 'APPROVED', v_firm_id
  from public.team_members where user_id = v_senior_id;

  -- ── Clients (mix of company/individual, one out-of-state for GST) ──
  insert into public.clients (name, kind, state, city, email, phone, gstin, firm_id) values
    ('Demo — Aurelia Developers Pvt Ltd', 'COMPANY', 'Karnataka', 'Bengaluru', 'projects@demo-aurelia.example', '+91 90000 00001', '29AADCA1111F1Z1', v_firm_id),
    ('Demo — Meera & Arjun Rao', 'INDIVIDUAL', 'Karnataka', 'Hubballi', 'meera.demo@example.com', '+91 90000 00002', null, v_firm_id),
    ('Demo — Kavya Interiors LLP', 'COMPANY', 'Karnataka', 'Bengaluru', 'hello@demo-kavya.example', '+91 90000 00003', '29AAKFK2222F1Z2', v_firm_id),
    ('Demo — Rohit & Sneha Kulkarni', 'INDIVIDUAL', 'Karnataka', 'Mysuru', 'kulkarni.demo@example.com', '+91 90000 00004', null, v_firm_id),
    ('Demo — Silver Oak Builders', 'COMPANY', 'Karnataka', 'Bengaluru', 'info@demo-silveroak.example', '+91 90000 00005', '29AASFS3333F1Z3', v_firm_id),
    ('Demo — Dr. Suresh Iyer', 'INDIVIDUAL', 'Tamil Nadu', 'Chennai', 'suresh.iyer.demo@example.com', '+91 90000 00006', null, v_firm_id),
    ('Demo — Greenfield Hospitality Pvt Ltd', 'COMPANY', 'Karnataka', 'Bengaluru', 'projects@demo-greenfield.example', '+91 90000 00007', '29AAGCF4444F1Z4', v_firm_id),
    ('Demo — Ananya & Kabir Menon', 'INDIVIDUAL', 'Karnataka', 'Bengaluru', 'menon.demo@example.com', '+91 90000 00008', null, v_firm_id),
    ('Demo — Vantage Corporate Parks LLP', 'COMPANY', 'Karnataka', 'Bengaluru', 'develop@demo-vantage.example', '+91 90000 00009', '29AAVFV5555F1Z5', v_firm_id),
    ('Demo — Lakeview Residents Welfare Association', 'COMPANY', 'Karnataka', 'Bengaluru', 'secretary@demo-lakeview.example', '+91 90000 00010', null, v_firm_id);

  -- ── Projects (12, spanning every status/work-type this app models) ─
  insert into public.project_offices (ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start, created_by_id, firm_id) values
    ('DEMO-PRJ-01', 'Demo — Aurelia Residences Phase 1', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 850000000, current_date - 120, v_owner_id, v_firm_id),
    ('DEMO-PRJ-02', 'Demo — Aurelia Residences Phase 2', 'Residential', 'ARCHITECTURE', 'BBMP', 'ENQUIRY',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 620000000, current_date - 5, v_owner_id, v_firm_id),
    ('DEMO-PRJ-03', 'Demo — Rao Family Residence', 'Residential', 'ARCHITECTURE', 'OTHER', 'PROPOSAL',
      (select id from public.clients where name = 'Demo — Meera & Arjun Rao' and firm_id = v_firm_id), 'Karnataka', 'Hubballi', 180000000, current_date - 20, v_senior_id, v_firm_id),
    ('DEMO-PRJ-04', 'Demo — Kavya Interiors Studio Fit-out', 'Interior', 'INTERIOR', 'OTHER', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Kavya Interiors LLP' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 95000000, current_date - 45, v_associate_id, v_firm_id),
    ('DEMO-PRJ-05', 'Demo — Kulkarni Weekend Home', 'Residential', 'ARCHITECTURE', 'OTHER', 'ON_HOLD',
      (select id from public.clients where name = 'Demo — Rohit & Sneha Kulkarni' and firm_id = v_firm_id), 'Karnataka', 'Mysuru', 260000000, current_date - 200, v_senior_id, v_firm_id),
    ('DEMO-PRJ-06', 'Demo — Silver Oak Commercial Complex', 'Commercial', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Silver Oak Builders' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 4200000000, current_date - 60, v_partner_id, v_firm_id),
    ('DEMO-PRJ-07', 'Demo — Iyer Residence Chennai', 'Residential', 'ARCHITECTURE', 'OTHER', 'COMPLETED',
      (select id from public.clients where name = 'Demo — Dr. Suresh Iyer' and firm_id = v_firm_id), 'Tamil Nadu', 'Chennai', 310000000, current_date - 400, v_owner_id, v_firm_id),
    ('DEMO-PRJ-08', 'Demo — Greenfield Boutique Hotel', 'Hospitality', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Greenfield Hospitality Pvt Ltd' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 3600000000, current_date - 80, v_partner_id, v_firm_id),
    ('DEMO-PRJ-09', 'Demo — Menon Residence Renovation', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Ananya & Kabir Menon' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 140000000, current_date - 30, v_associate_id, v_firm_id),
    ('DEMO-PRJ-10', 'Demo — Vantage Corporate Park Block C', 'Commercial', 'ARCHITECTURE', 'BBMP', 'PROPOSAL',
      (select id from public.clients where name = 'Demo — Vantage Corporate Parks LLP' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 6800000000, current_date - 15, v_owner_id, v_firm_id),
    ('DEMO-PRJ-11', 'Demo — Lakeview Clubhouse Redevelopment', 'Institutional', 'ARCHITECTURE', 'BBMP', 'ENQUIRY',
      (select id from public.clients where name = 'Demo — Lakeview Residents Welfare Association' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 220000000, current_date - 3, v_senior_id, v_firm_id),
    ('DEMO-PRJ-12', 'Demo — Aurelia Residences Phase 1 — Landscape', 'Landscape', 'LANDSCAPE', 'BBMP', 'CANCELLED',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'Karnataka', 'Bengaluru', 45000000, current_date - 100, v_owner_id, v_firm_id);

  -- ── Contractors ─────────────────────────────────────────────────────
  insert into public.contractors (name, category, company_name, contact_person, email, phone, city, state, active, quality_rating, timeliness_rating, safety_rating, firm_id) values
    ('Demo — Balaji Civil Works', 'Civil Contractor', 'Balaji Construction Co.', 'S. Balaji', 'balaji.demo@example.com', '+91 90000 10001', 'Bengaluru', 'Karnataka', true, 4, 3, 4, v_firm_id),
    ('Demo — Precision MEP Systems', 'MEP Contractor', 'Precision MEP Pvt Ltd', 'Farah Khan', 'farah.demo@example.com', '+91 90000 10002', 'Bengaluru', 'Karnataka', true, 5, 4, 5, v_firm_id),
    ('Demo — Ironclad Structural Steel', 'Structural Steel', 'Ironclad Fabricators', 'D. Prasad', 'prasad.demo@example.com', '+91 90000 10003', 'Bengaluru', 'Karnataka', true, 4, 4, 4, v_firm_id),
    ('Demo — Studio Finesse Interiors', 'Interior Fit-out', 'Studio Finesse', 'Rhea Kapoor', 'rhea.demo@example.com', '+91 90000 10004', 'Bengaluru', 'Karnataka', true, 5, 3, 4, v_firm_id),
    ('Demo — GreenScape Landscaping', 'Landscaping', 'GreenScape Co.', 'Manoj Gowda', 'manoj.demo@example.com', '+91 90000 10005', 'Mysuru', 'Karnataka', true, 4, 4, 5, v_firm_id),
    ('Demo — Chennai Foundations Ltd', 'Civil Contractor', 'Chennai Foundations', 'K. Raghavan', 'raghavan.demo@example.com', '+91 90000 10006', 'Chennai', 'Tamil Nadu', false, 3, 3, 3, v_firm_id);

  -- ── Consultants ─────────────────────────────────────────────────────
  insert into public.consultants (name, discipline, firm, email, phone, firm_id) values
    ('Demo — Ar. Nitin Kamath', 'Structural Engineering', 'Kamath Structural Consultants', 'nitin.demo@example.com', '+91 90000 20001', v_firm_id),
    ('Demo — Deepa Rangan', 'MEP Consulting', 'Rangan MEP Associates', 'deepa.demo@example.com', '+91 90000 20002', v_firm_id),
    ('Demo — Landscape Studio Bloom', 'Landscape Design', 'Studio Bloom', 'contact.demo@example.com', '+91 90000 20003', v_firm_id),
    ('Demo — Lumen Lighting Design', 'Lighting Consulting', 'Lumen Design Co.', 'lumen.demo@example.com', '+91 90000 20004', v_firm_id),
    ('Demo — Aparna Vaidya, Acoustics', 'Acoustic Consulting', null, 'aparna.demo@example.com', '+91 90000 20005', v_firm_id);

  -- ── Tasks (real spread of status/priority/assignee/due-date so Pulse
  --     has real gaps, overdue items, and blocked chains to score) ─────
  insert into public.tasks (title, project_id, assignee_id, status, priority, classification, work_type, due_date, created_by_id, firm_id) values
    ('Demo — Concept design review', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), v_senior_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 3, v_owner_id, v_firm_id),
    ('Demo — Structural coordination', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), v_associate_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 10, v_senior_id, v_firm_id),
    ('Demo — Working drawings — GF plan', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 5, v_senior_id, v_firm_id),
    ('Demo — Site visit report', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), null, 'BLOCKED', 'HIGH', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 2, v_owner_id, v_firm_id),
    ('Demo — Client walkthrough — Phase 1', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), v_owner_id, 'TODO', 'CRITICAL', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date - 1, v_owner_id, v_firm_id),
    ('Demo — Phase 2 feasibility sketch', (select id from public.project_offices where ref='DEMO-PRJ-02' and firm_id = v_firm_id), v_senior_id, 'TODO', 'MEDIUM', 'NON_BILLABLE', 'DESIGN_DEVELOPMENT', null, v_owner_id, v_firm_id),
    ('Demo — Client brief follow-up', (select id from public.project_offices where ref='DEMO-PRJ-03' and firm_id = v_firm_id), null, 'TODO', 'LOW', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date + 14, v_senior_id, v_firm_id),
    ('Demo — Fee proposal revision', (select id from public.project_offices where ref='DEMO-PRJ-03' and firm_id = v_firm_id), v_owner_id, 'IN_PROGRESS', 'MEDIUM', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date + 4, v_senior_id, v_firm_id),
    ('Demo — Material palette finalisation', (select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), v_associate_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 2, v_associate_id, v_firm_id),
    ('Demo — Furniture layout — reception', (select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 8, v_associate_id, v_firm_id),
    ('Demo — Vendor RFQ — joinery', (select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), null, 'TODO', 'MEDIUM', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 3, v_associate_id, v_firm_id),
    ('Demo — On-hold status client call', (select id from public.project_offices where ref='DEMO-PRJ-05' and firm_id = v_firm_id), v_senior_id, 'TODO', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date + 30, v_senior_id, v_firm_id),
    ('Demo — GFC drawings — tower A', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), v_partner_id, 'IN_PROGRESS', 'CRITICAL', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 1, v_partner_id, v_firm_id),
    ('Demo — Facade mock-up review', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), v_senior_id, 'TODO', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 6, v_partner_id, v_firm_id),
    ('Demo — Fire NOC coordination', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), null, 'BLOCKED', 'CRITICAL', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 4, v_partner_id, v_firm_id),
    ('Demo — Structural peer review', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), v_associate_id, 'TODO', 'HIGH', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 8, v_partner_id, v_firm_id),
    ('Demo — Handover documentation archive', (select id from public.project_offices where ref='DEMO-PRJ-07' and firm_id = v_firm_id), v_owner_id, 'DONE', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date - 30, v_owner_id, v_firm_id),
    ('Demo — Defect liability walkthrough', (select id from public.project_offices where ref='DEMO-PRJ-07' and firm_id = v_firm_id), v_senior_id, 'DONE', 'MEDIUM', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 15, v_owner_id, v_firm_id),
    ('Demo — Kitchen layout — back of house', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), v_associate_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 5, v_partner_id, v_firm_id),
    ('Demo — Guest room typical unit — RCP', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), v_associate_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 12, v_partner_id, v_firm_id),
    ('Demo — Lighting consultant coordination', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), v_senior_id, 'BLOCKED', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 6, v_partner_id, v_firm_id),
    ('Demo — Fire safety compliance check', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), null, 'TODO', 'CRITICAL', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 3, v_partner_id, v_firm_id),
    ('Demo — Renovation demolition plan', (select id from public.project_offices where ref='DEMO-PRJ-09' and firm_id = v_firm_id), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 10, v_associate_id, v_firm_id),
    ('Demo — Structural opening approvals', (select id from public.project_offices where ref='DEMO-PRJ-09' and firm_id = v_firm_id), v_senior_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date + 4, v_associate_id, v_firm_id),
    ('Demo — Client selection — flooring', (select id from public.project_offices where ref='DEMO-PRJ-09' and firm_id = v_firm_id), null, 'TODO', 'LOW', 'BILLABLE', 'DESIGN_COMMUNICATION', null, v_associate_id, v_firm_id),
    ('Demo — Corporate park massing study', (select id from public.project_offices where ref='DEMO-PRJ-10' and firm_id = v_firm_id), v_owner_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 7, v_owner_id, v_firm_id),
    ('Demo — Parking ratio compliance check', (select id from public.project_offices where ref='DEMO-PRJ-10' and firm_id = v_firm_id), v_partner_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 15, v_owner_id, v_firm_id),
    ('Demo — Clubhouse condition survey', (select id from public.project_offices where ref='DEMO-PRJ-11' and firm_id = v_firm_id), v_senior_id, 'TODO', 'MEDIUM', 'NON_BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 9, v_senior_id, v_firm_id),
    ('Demo — RWA committee presentation', (select id from public.project_offices where ref='DEMO-PRJ-11' and firm_id = v_firm_id), v_owner_id, 'TODO', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date + 20, v_senior_id, v_firm_id),
    ('Demo — Landscape scope closeout note', (select id from public.project_offices where ref='DEMO-PRJ-12' and firm_id = v_firm_id), v_associate_id, 'DONE', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date - 60, v_owner_id, v_firm_id);

  -- One real dependency chain on the busiest project — the site-visit
  -- report is blocked on the client walkthrough happening first.
  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type, firm_id)
  select t1.id, t2.id, 'BLOCKS', v_firm_id
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Site visit report' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id)
    and t2.title = 'Demo — Client walkthrough — Phase 1' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id);

  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type, firm_id)
  select t1.id, t2.id, 'BLOCKS', v_firm_id
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Fire NOC coordination' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id)
    and t2.title = 'Demo — Structural peer review' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id);

  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type, firm_id)
  select t1.id, t2.id, 'APPROVAL', v_firm_id
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Lighting consultant coordination' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id)
    and t2.title = 'Demo — Fire safety compliance check' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id);

  -- ── Invoices (DRAFT / ISSUED-unpaid / ISSUED-partial / PAID) ───────
  insert into public.invoices (ref, project_id, client_id, status, gst_system, document_kind, inter_state, tds_applicable, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, tds_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice, firm_id) values
    ('DEMO-INV-01', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 50000000, 4500000, 4500000, 0, 9000000, 0, 59000000, 59000000, 59000000, current_date - 60, v_firm_id),
    ('DEMO-INV-02', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 65000000, 5850000, 5850000, 0, 11700000, 0, 76700000, 76700000, 30000000, current_date - 20, v_firm_id),
    ('DEMO-INV-03', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd' and firm_id = v_firm_id), 'DRAFT', 'REGULAR', 'TAX_INVOICE', false, false, 42000000, 3780000, 3780000, 0, 7560000, 0, 49560000, 49560000, 0, null, v_firm_id),
    ('DEMO-INV-04', (select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Kavya Interiors LLP' and firm_id = v_firm_id), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 18000000, 1620000, 1620000, 0, 3240000, 0, 21240000, 21240000, 21240000, current_date - 40, v_firm_id),
    ('DEMO-INV-05', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Silver Oak Builders' and firm_id = v_firm_id), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, true, 220000000, 19800000, 19800000, 0, 39600000, 4400000, 259600000, 255200000, 100000000, current_date - 10, v_firm_id),
    ('DEMO-INV-06', (select id from public.project_offices where ref='DEMO-PRJ-07' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Dr. Suresh Iyer' and firm_id = v_firm_id), 'PAID', 'REGULAR', 'TAX_INVOICE', true, false, 31000000, 0, 0, 5580000, 5580000, 0, 36580000, 36580000, 36580000, current_date - 90, v_firm_id),
    ('DEMO-INV-07', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Greenfield Hospitality Pvt Ltd' and firm_id = v_firm_id), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, true, 180000000, 16200000, 16200000, 0, 32400000, 3600000, 212400000, 208800000, 0, current_date - 5, v_firm_id),
    ('DEMO-INV-08', (select id from public.project_offices where ref='DEMO-PRJ-09' and firm_id = v_firm_id), (select id from public.clients where name='Demo — Ananya & Kabir Menon' and firm_id = v_firm_id), 'DRAFT', 'REGULAR', 'TAX_INVOICE', false, false, 14000000, 1260000, 1260000, 0, 2520000, 0, 16520000, 16520000, 0, null, v_firm_id);

  -- ── Proposals ───────────────────────────────────────────────────────
  insert into public.proposals (ref, project_id, status, work_category, work_type, fee_basis, cost_of_works_paise, fee_paise, client_approval_status, client_approved_at, firm_id) values
    ('DEMO-PRP-01', (select id from public.project_offices where ref='DEMO-PRJ-03' and firm_id = v_firm_id), 'SENT', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 180000000, 10800000, 'PENDING', null, v_firm_id),
    ('DEMO-PRP-02', (select id from public.project_offices where ref='DEMO-PRJ-10' and firm_id = v_firm_id), 'SENT', 'Architectural Design Services', 'ARCHITECTURE', 'PER_SQM', 6800000000, 340000000, 'PENDING', null, v_firm_id),
    ('DEMO-PRP-03', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), 'APPROVED', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 850000000, 51000000, 'APPROVED', now() - interval '100 days', v_firm_id),
    ('DEMO-PRP-04', (select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), 'APPROVED', 'Interior Design Services', 'INTERIOR', 'LUMPSUM', 95000000, 12000000, 'APPROVED', now() - interval '40 days', v_firm_id),
    ('DEMO-PRP-05', (select id from public.project_offices where ref='DEMO-PRJ-11' and firm_id = v_firm_id), 'DRAFT', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 220000000, 13200000, 'PENDING', null, v_firm_id);

  -- ── Leads ───────────────────────────────────────────────────────────
  insert into public.leads (ref, client_name, lead_source, project_type, city, status, assigned_to_id, firm_id) values
    ('DEMO-LEAD-01', 'Demo — Kavya Interiors Enquiry', 'Website', 'Interior', 'Bengaluru', 'CONTACTED', v_associate_id, v_firm_id),
    ('DEMO-LEAD-02', 'Demo — Whitefield Apartments RWA', 'Referral', 'Institutional', 'Bengaluru', 'NEW', null, v_firm_id),
    ('DEMO-LEAD-03', 'Demo — Coastal Weekend Villa Enquiry', 'Instagram', 'Residential', 'Mangaluru', 'ASSESSMENT_STARTED', v_senior_id, v_firm_id),
    ('DEMO-LEAD-04', 'Demo — Retail Store Fit-out Chain', 'Referral', 'Commercial', 'Bengaluru', 'QUALIFIED', v_partner_id, v_firm_id);

  -- ── Decisions (CRIF register) — spans every state/impact combo ──────
  insert into public.decisions (project_id, title, rationale, state, revision_category, revision_source, impact, owner_name, review_deadline, created_by_id, firm_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), 'Demo — Facade material: fibre-cement vs. exposed brick',
      'After reviewing three facade material samples with the client, the team recommends textured grey fibre-cement cladding panels over exposed brick for better weather resistance and lower long-term maintenance given the site''s coastal-adjacent microclimate.',
      'CLIENT_REVIEW', 'MAJOR', 'CLIENT_DRIVEN', 'HIGH', 'Ar. Aditi Rao', current_date + 7, v_owner_id, v_firm_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), 'Demo — Podium slab redesign for parking ramp clearance',
      'The structural consultant flagged insufficient headroom clearance on the originally drawn podium slab for the parking ramp; the slab has been redesigned with a revised beam depth to restore the required 2.4m clearance.',
      'CLIENT_REVIEW', 'CRITICAL', 'TECHNICAL_QUERY', 'HIGH', 'Ar. Vikram Shah', current_date + 3, v_partner_id, v_firm_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), 'Demo — Kitchen exhaust routing relocated',
      'The back-of-house kitchen exhaust duct routing conflicted with a structural beam; the MEP consultant proposed rerouting through the adjacent service shaft, adding minor cost but no schedule impact.',
      'ACCEPTED', 'MINOR', 'TECHNICAL_QUERY', 'MEDIUM', 'Ar. Vikram Shah', null, v_partner_id, v_firm_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-04' and firm_id = v_firm_id), 'Demo — Reception counter material downgrade',
      'To stay within the approved budget, the reception counter finish was changed from natural stone to an engineered quartz alternative with a comparable appearance.',
      'LOCKED', 'MINOR', 'SCOPE_CHANGE', 'LOW', 'Priya Nair', null, v_associate_id, v_firm_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-09' and firm_id = v_firm_id), 'Demo — Structural opening size for renovation',
      'Draft note pending structural consultant sign-off on the proposed 1.2m wide structural opening for the renovated living-dining connection.',
      'DRAFT', null, null, 'MEDIUM', 'Priya Nair', current_date + 12, v_associate_id, v_firm_id);

  -- ── Meeting minutes (real free-text content, for Pulse RAG search) ──
  insert into public.moms (ref, project_id, title, meeting_date, venue, attendees, minutes, status, firm_id) values
    ('DEMO-MOM-01', (select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), 'Demo — Facade material review meeting', current_date - 6, 'Site office, Bengaluru', 'Ar. Aditi Rao, Client representative, Ar. Nitin Kamath',
      'The team presented three facade material samples to the client: exposed brick, textured grey fibre-cement cladding, and a natural stone veneer. After discussion of long-term maintenance in the site''s humid microclimate and weather resistance, the client agreed to proceed with the fibre-cement cladding option. The stone veneer was ruled out due to cost, and exposed brick was ruled out due to maintenance concerns raised by the client''s facilities team. Next steps: issue a formal decision note and update the elevation drawings accordingly.',
      'ISSUED', v_firm_id),
    ('DEMO-MOM-02', (select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), 'Demo — Podium parking clearance coordination', current_date - 3, 'Aurelia site office', 'Ar. Vikram Shah, Structural consultant, Site engineer',
      'The structural consultant raised a clearance conflict on the podium slab affecting the parking ramp headroom. The team reviewed two options — lowering the ramp gradient or redesigning the slab beam depth — and agreed the beam redesign was preferable since it does not affect the approved ramp gradient in the sanctioned drawings. The structural consultant will issue revised structural drawings within one week.',
      'ISSUED', v_firm_id),
    ('DEMO-MOM-03', (select id from public.project_offices where ref='DEMO-PRJ-08' and firm_id = v_firm_id), 'Demo — Kitchen MEP coordination meeting', current_date - 8, 'Virtual (Google Meet)', 'Ar. Vikram Shah, MEP consultant, Kitchen equipment vendor',
      'The kitchen exhaust duct routing was found to clash with a structural transfer beam above the back-of-house corridor. The MEP consultant proposed rerouting the duct through the adjacent service shaft instead, which the structural consultant confirmed has adequate capacity. The kitchen equipment vendor confirmed the revised routing does not affect equipment placement. Agreed to proceed with the rerouted duct design.',
      'DRAFT', v_firm_id);

  -- ── Progress reports (real narrative content, for Pulse RAG search) ─
  insert into public.progress_reports (project_id, period_start, period_end, narrative, physical_progress_pct, schedule_progress_pct, open_snag_count, open_rfi_count, status, created_by_id, firm_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01' and firm_id = v_firm_id), current_date - 30, current_date, 'Structural work for the ground and first floor slabs is complete. Brickwork has commenced on the ground floor. The facade material decision was finalised this period after client review, and elevation drawings are being updated to reflect the approved fibre-cement cladding. Site visit reports flagged minor water pooling near the north boundary wall, which the contractor has been asked to address before the next monsoon.',
      35, 30, 2, 1, 'ISSUED', v_owner_id, v_firm_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06' and firm_id = v_firm_id), current_date - 25, current_date - 1, 'Tower A structural frame has reached the 6th floor. The podium slab redesign for parking ramp clearance was approved this period and revised structural drawings have been issued to the contractor. Facade mock-up panels were installed on site for client review; feedback is pending. Fire NOC coordination remains open pending the fire consultant''s revised layout submission.',
      42, 38, 4, 3, 'ISSUED', v_partner_id, v_firm_id);

end;
$function$;
