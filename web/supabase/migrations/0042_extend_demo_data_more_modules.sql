-- Extend demo data to the remaining empty modules (2026-09-13) — the
-- click-through testing pass resumed this session found that migration
-- 0041's "extensive demo data" only ever touched 14 tables (clients,
-- consultants, contractors, decisions, invoices, leads, leaves, moms,
-- progress_reports, project_offices, proposals, task_dependencies,
-- tasks, team_members) — every other module (Estimates, Rate Books,
-- Spec Sheets, Drawings, Document Issues, BBS, Snags, Site Instructions,
-- Contracts, Letters, Transmittals, Tenders, Purchase Orders, Payslips,
-- Job Applications, Master Plans, Standards, Compliance, Spec Catalog,
-- Lessons Learned, Knowledge Bank, PMC Milestones/Packages/Steel Certs/
-- RA Bills, Teams, Office Templates) rendered correctly but showed
-- "No … yet" because there were simply zero rows — not a UI bug, but it
-- meant those ~25 pages couldn't be click-through tested at all. Same
-- function (`reset_demo_data()`), same delete-then-insert idempotency,
-- same "Demo — " / "DEMO-xxx" naming convention as 0041 — just extended
-- to cover the rest of the schema. All new rows hang off the same 12
-- demo projects / 5 staff / 6 contractors / 5 consultants / 10 clients
-- 0041 already created.

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

  -- ── Firm profile ──────────────────────────────────────────────────
  update public.firm set
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
  where singleton = true;

  -- ── Wipe previous demo rows (widened prefixes/name patterns) ───────
  delete from public.task_missing_params where task_id in (select id from public.tasks where title like 'Demo — %');
  delete from public.task_dependencies where task_id in (select id from public.tasks where title like 'Demo — %') or depends_on_task_id in (select id from public.tasks where title like 'Demo — %');
  delete from public.task_priority_log where task_id in (select id from public.tasks where title like 'Demo — %');
  delete from public.esti_embeddings where source_id in (
    select id from public.moms where ref like 'DEMO-%'
    union select id from public.progress_reports where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%')
    union select id from public.decisions where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%')
  );
  delete from public.moms where ref like 'DEMO-%';
  delete from public.progress_reports where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%');
  delete from public.decisions where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%');
  delete from public.proposals where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%');
  delete from public.invoices where ref like 'DEMO-%';
  delete from public.tasks where title like 'Demo — %';
  delete from public.leads where ref like 'DEMO-%';

  -- ── New this migration: everything else that hangs off the demo
  --     projects/contractors/rate books, deleted (children first) before
  --     the project_offices/contractors wipe below, since most of these
  --     FKs have no ON DELETE CASCADE. ──────────────────────────────────
  delete from public.estimate_items where estimate_id in (select id from public.estimates where ref like 'DEMO-EST-%');
  delete from public.estimates where ref like 'DEMO-EST-%';
  delete from public.rate_book_items where rate_book_id in (select id from public.rate_books where name like 'Demo — %');
  delete from public.rate_books where name like 'Demo — %';
  delete from public.spec_items where spec_sheet_id in (select id from public.spec_sheets where ref like 'DEMO-SPEC-%');
  delete from public.spec_sheets where ref like 'DEMO-SPEC-%';
  delete from public.document_issues where ref like 'DEMO-DOC-%';
  delete from public.transmittals where ref like 'DEMO-TRN-%';
  delete from public.drawings where ref like 'DEMO-DWG-%';
  delete from public.bbs_items where bbs_id in (select id from public.bbs_schedules where ref like 'DEMO-BBS-%');
  delete from public.bbs_members where bbs_id in (select id from public.bbs_schedules where ref like 'DEMO-BBS-%');
  delete from public.bbs_schedules where ref like 'DEMO-BBS-%';
  delete from public.snags where ref like 'DEMO-SNAG-%';
  delete from public.site_instructions where ref like 'DEMO-SI-%';
  delete from public.contracts where ref like 'DEMO-CTR-%';
  delete from public.letters where ref like 'DEMO-LTR-%';
  delete from public.po_items where po_id in (select id from public.purchase_orders where ref like 'DEMO-PO-%');
  delete from public.purchase_orders where ref like 'DEMO-PO-%';
  delete from public.tenders where title like 'Demo — %' and project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%');
  delete from public.pmc_ra_lines where bill_id in (select id from public.pmc_ra_bills where ref like 'DEMO-RA-%');
  delete from public.pmc_ra_bills where ref like 'DEMO-RA-%';
  delete from public.pmc_steel_certs where ref like 'DEMO-STC-%';
  delete from public.pmc_packages where ref like 'DEMO-PKG-%';
  delete from public.pmc_milestones where ref like 'DEMO-MS-%';
  delete from public.lessons_learned where project_id in (select id from public.project_offices where ref like 'DEMO-PRJ-%');

  delete from public.project_offices where ref like 'DEMO-PRJ-%';
  delete from public.clients where name like 'Demo — %';
  delete from public.contractors where name like 'Demo — %';
  delete from public.consultants where name like 'Demo — %';

  -- ── New this migration: standalone tables with no project/contractor/
  --     team-member FK dependency — order doesn't matter relative to the
  --     blocks above or below. ────────────────────────────────────────
  delete from public.master_plans where name like 'Demo — %';
  delete from public.standard_files where standard_id in (select id from public.standards where title like 'Demo — %');
  delete from public.standards where title like 'Demo — %';
  delete from public.compliance_far where zone like 'Demo — %';
  delete from public.compliance_setback where zone like 'Demo — %';
  delete from public.compliance_nbc where clause like 'Demo — %';
  delete from public.compliance_fire where building_type like 'Demo — %';
  delete from public.compliance_regulation where authority like 'Demo — %';
  delete from public.spec_catalog_items where version_id in (select id from public.spec_catalog_versions where label like 'Demo — %');
  delete from public.spec_catalog_versions where label like 'Demo — %';
  delete from public.repo_sections where source_id in (select id from public.repo_sources where title like 'Demo — %');
  delete from public.repo_sources where title like 'Demo — %';
  delete from public.office_templates where title like 'Demo — %';
  delete from public.job_applications where name like 'Demo — %';

  -- ── New this migration: team-member-scoped tables — must be wiped
  --     before team_members itself is deleted below (plain FK, no
  --     cascade). ──────────────────────────────────────────────────────
  delete from public.payslips where team_member_id in (select id from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id));
  delete from public.team_memberships where team_member_id in (select id from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id));
  delete from public.teams where name like 'Demo — %';

  delete from public.leaves where team_member_id in (select id from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id));
  delete from public.team_members where user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id);

  -- ── Team members (HR side — leaves/payroll read this, not profiles).
  --     `role` here is a free-text designation (NewTeamMemberForm's own
  --     placeholder is "e.g. Senior Architect"), not the profiles.role
  --     app_role enum — the two are deliberately different vocabularies.
  insert into public.team_members (name, role, employment_type, email, monthly_salary_paise, date_joined, active, user_id, job_title) values
    ('Ar. Aditi Rao', 'Principal Architect', 'FULL_TIME', 'aditi.rao@aorms.in', 25000000, '2018-04-01', true, v_owner_id, 'Principal Architect'),
    ('Ar. Vikram Shah', 'Partner', 'FULL_TIME', 'vikram.shah@aorms.in', 20000000, '2019-06-15', true, v_partner_id, 'Partner'),
    ('Ar. Akash Mehta', 'Senior Architect', 'FULL_TIME', 'akash.mehta@aorms.in', 12000000, '2021-01-10', true, v_senior_id, 'Senior Architect'),
    ('Priya Nair', 'Associate Architect', 'FULL_TIME', 'priya.nair@aorms.in', 7500000, '2023-07-01', true, v_associate_id, 'Associate Architect'),
    ('Rohan Desai', 'Accounts & Compliance', 'FULL_TIME', 'rohan.desai@aorms.in', 6500000, '2022-03-20', true, v_accountant_id, 'Accounts & Compliance');

  -- Ar. Akash Mehta is on approved leave today, every day this runs —
  -- matches the landing page's own placeholder copy ("Ar Akash is on
  -- leave today") and exercises the dashboard's Team Availability
  -- widget / Daily Brief with a real row, not an invented one.
  insert into public.leaves (team_member_id, type, from_date, to_date, days, reason, status)
  select id, 'CASUAL', current_date, current_date, 1, 'Family function', 'APPROVED'
  from public.team_members where user_id = v_senior_id;

  -- ── Clients (mix of company/individual, one out-of-state for GST) ──
  insert into public.clients (name, kind, state, city, email, phone, gstin) values
    ('Demo — Aurelia Developers Pvt Ltd', 'COMPANY', 'Karnataka', 'Bengaluru', 'projects@demo-aurelia.example', '+91 90000 00001', '29AADCA1111F1Z1'),
    ('Demo — Meera & Arjun Rao', 'INDIVIDUAL', 'Karnataka', 'Hubballi', 'meera.demo@example.com', '+91 90000 00002', null),
    ('Demo — Kavya Interiors LLP', 'COMPANY', 'Karnataka', 'Bengaluru', 'hello@demo-kavya.example', '+91 90000 00003', '29AAKFK2222F1Z2'),
    ('Demo — Rohit & Sneha Kulkarni', 'INDIVIDUAL', 'Karnataka', 'Mysuru', 'kulkarni.demo@example.com', '+91 90000 00004', null),
    ('Demo — Silver Oak Builders', 'COMPANY', 'Karnataka', 'Bengaluru', 'info@demo-silveroak.example', '+91 90000 00005', '29AASFS3333F1Z3'),
    ('Demo — Dr. Suresh Iyer', 'INDIVIDUAL', 'Tamil Nadu', 'Chennai', 'suresh.iyer.demo@example.com', '+91 90000 00006', null),
    ('Demo — Greenfield Hospitality Pvt Ltd', 'COMPANY', 'Karnataka', 'Bengaluru', 'projects@demo-greenfield.example', '+91 90000 00007', '29AAGCF4444F1Z4'),
    ('Demo — Ananya & Kabir Menon', 'INDIVIDUAL', 'Karnataka', 'Bengaluru', 'menon.demo@example.com', '+91 90000 00008', null),
    ('Demo — Vantage Corporate Parks LLP', 'COMPANY', 'Karnataka', 'Bengaluru', 'develop@demo-vantage.example', '+91 90000 00009', '29AAVFV5555F1Z5'),
    ('Demo — Lakeview Residents Welfare Association', 'COMPANY', 'Karnataka', 'Bengaluru', 'secretary@demo-lakeview.example', '+91 90000 00010', null);

  -- ── Projects (12, spanning every status/work-type this app models) ─
  insert into public.project_offices (ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start, created_by_id) values
    ('DEMO-PRJ-01', 'Demo — Aurelia Residences Phase 1', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd'), 'Karnataka', 'Bengaluru', 850000000, current_date - 120, v_owner_id),
    ('DEMO-PRJ-02', 'Demo — Aurelia Residences Phase 2', 'Residential', 'ARCHITECTURE', 'BBMP', 'ENQUIRY',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd'), 'Karnataka', 'Bengaluru', 620000000, current_date - 5, v_owner_id),
    ('DEMO-PRJ-03', 'Demo — Rao Family Residence', 'Residential', 'ARCHITECTURE', 'OTHER', 'PROPOSAL',
      (select id from public.clients where name = 'Demo — Meera & Arjun Rao'), 'Karnataka', 'Hubballi', 180000000, current_date - 20, v_senior_id),
    ('DEMO-PRJ-04', 'Demo — Kavya Interiors Studio Fit-out', 'Interior', 'INTERIOR', 'OTHER', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Kavya Interiors LLP'), 'Karnataka', 'Bengaluru', 95000000, current_date - 45, v_associate_id),
    ('DEMO-PRJ-05', 'Demo — Kulkarni Weekend Home', 'Residential', 'ARCHITECTURE', 'OTHER', 'ON_HOLD',
      (select id from public.clients where name = 'Demo — Rohit & Sneha Kulkarni'), 'Karnataka', 'Mysuru', 260000000, current_date - 200, v_senior_id),
    ('DEMO-PRJ-06', 'Demo — Silver Oak Commercial Complex', 'Commercial', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Silver Oak Builders'), 'Karnataka', 'Bengaluru', 4200000000, current_date - 60, v_partner_id),
    ('DEMO-PRJ-07', 'Demo — Iyer Residence Chennai', 'Residential', 'ARCHITECTURE', 'OTHER', 'COMPLETED',
      (select id from public.clients where name = 'Demo — Dr. Suresh Iyer'), 'Tamil Nadu', 'Chennai', 310000000, current_date - 400, v_owner_id),
    ('DEMO-PRJ-08', 'Demo — Greenfield Boutique Hotel', 'Hospitality', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Greenfield Hospitality Pvt Ltd'), 'Karnataka', 'Bengaluru', 3600000000, current_date - 80, v_partner_id),
    ('DEMO-PRJ-09', 'Demo — Menon Residence Renovation', 'Residential', 'ARCHITECTURE', 'BBMP', 'ACTIVE',
      (select id from public.clients where name = 'Demo — Ananya & Kabir Menon'), 'Karnataka', 'Bengaluru', 140000000, current_date - 30, v_associate_id),
    ('DEMO-PRJ-10', 'Demo — Vantage Corporate Park Block C', 'Commercial', 'ARCHITECTURE', 'BBMP', 'PROPOSAL',
      (select id from public.clients where name = 'Demo — Vantage Corporate Parks LLP'), 'Karnataka', 'Bengaluru', 6800000000, current_date - 15, v_owner_id),
    ('DEMO-PRJ-11', 'Demo — Lakeview Clubhouse Redevelopment', 'Institutional', 'ARCHITECTURE', 'BBMP', 'ENQUIRY',
      (select id from public.clients where name = 'Demo — Lakeview Residents Welfare Association'), 'Karnataka', 'Bengaluru', 220000000, current_date - 3, v_senior_id),
    ('DEMO-PRJ-12', 'Demo — Aurelia Residences Phase 1 — Landscape', 'Landscape', 'LANDSCAPE', 'BBMP', 'CANCELLED',
      (select id from public.clients where name = 'Demo — Aurelia Developers Pvt Ltd'), 'Karnataka', 'Bengaluru', 45000000, current_date - 100, v_owner_id);

  -- ── Contractors ─────────────────────────────────────────────────────
  insert into public.contractors (name, category, company_name, contact_person, email, phone, city, state, active, quality_rating, timeliness_rating, safety_rating) values
    ('Demo — Balaji Civil Works', 'Civil Contractor', 'Balaji Construction Co.', 'S. Balaji', 'balaji.demo@example.com', '+91 90000 10001', 'Bengaluru', 'Karnataka', true, 4, 3, 4),
    ('Demo — Precision MEP Systems', 'MEP Contractor', 'Precision MEP Pvt Ltd', 'Farah Khan', 'farah.demo@example.com', '+91 90000 10002', 'Bengaluru', 'Karnataka', true, 5, 4, 5),
    ('Demo — Ironclad Structural Steel', 'Structural Steel', 'Ironclad Fabricators', 'D. Prasad', 'prasad.demo@example.com', '+91 90000 10003', 'Bengaluru', 'Karnataka', true, 4, 4, 4),
    ('Demo — Studio Finesse Interiors', 'Interior Fit-out', 'Studio Finesse', 'Rhea Kapoor', 'rhea.demo@example.com', '+91 90000 10004', 'Bengaluru', 'Karnataka', true, 5, 3, 4),
    ('Demo — GreenScape Landscaping', 'Landscaping', 'GreenScape Co.', 'Manoj Gowda', 'manoj.demo@example.com', '+91 90000 10005', 'Mysuru', 'Karnataka', true, 4, 4, 5),
    ('Demo — Chennai Foundations Ltd', 'Civil Contractor', 'Chennai Foundations', 'K. Raghavan', 'raghavan.demo@example.com', '+91 90000 10006', 'Chennai', 'Tamil Nadu', false, 3, 3, 3);

  -- ── Consultants ─────────────────────────────────────────────────────
  insert into public.consultants (name, discipline, firm, email, phone) values
    ('Demo — Ar. Nitin Kamath', 'Structural Engineering', 'Kamath Structural Consultants', 'nitin.demo@example.com', '+91 90000 20001'),
    ('Demo — Deepa Rangan', 'MEP Consulting', 'Rangan MEP Associates', 'deepa.demo@example.com', '+91 90000 20002'),
    ('Demo — Landscape Studio Bloom', 'Landscape Design', 'Studio Bloom', 'contact.demo@example.com', '+91 90000 20003'),
    ('Demo — Lumen Lighting Design', 'Lighting Consulting', 'Lumen Design Co.', 'lumen.demo@example.com', '+91 90000 20004'),
    ('Demo — Aparna Vaidya, Acoustics', 'Acoustic Consulting', null, 'aparna.demo@example.com', '+91 90000 20005');

  -- ── Tasks (real spread of status/priority/assignee/due-date so Pulse
  --     has real gaps, overdue items, and blocked chains to score) ─────
  insert into public.tasks (title, project_id, assignee_id, status, priority, classification, work_type, due_date, created_by_id) values
    ('Demo — Concept design review', (select id from public.project_offices where ref='DEMO-PRJ-01'), v_senior_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 3, v_owner_id),
    ('Demo — Structural coordination', (select id from public.project_offices where ref='DEMO-PRJ-01'), v_associate_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 10, v_senior_id),
    ('Demo — Working drawings — GF plan', (select id from public.project_offices where ref='DEMO-PRJ-01'), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 5, v_senior_id),
    ('Demo — Site visit report', (select id from public.project_offices where ref='DEMO-PRJ-01'), null, 'BLOCKED', 'HIGH', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 2, v_owner_id),
    ('Demo — Client walkthrough — Phase 1', (select id from public.project_offices where ref='DEMO-PRJ-01'), v_owner_id, 'TODO', 'CRITICAL', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date - 1, v_owner_id),
    ('Demo — Phase 2 feasibility sketch', (select id from public.project_offices where ref='DEMO-PRJ-02'), v_senior_id, 'TODO', 'MEDIUM', 'NON_BILLABLE', 'DESIGN_DEVELOPMENT', null, v_owner_id),
    ('Demo — Client brief follow-up', (select id from public.project_offices where ref='DEMO-PRJ-03'), null, 'TODO', 'LOW', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date + 14, v_senior_id),
    ('Demo — Fee proposal revision', (select id from public.project_offices where ref='DEMO-PRJ-03'), v_owner_id, 'IN_PROGRESS', 'MEDIUM', 'BILLABLE', 'DESIGN_COMMUNICATION', current_date + 4, v_senior_id),
    ('Demo — Material palette finalisation', (select id from public.project_offices where ref='DEMO-PRJ-04'), v_associate_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 2, v_associate_id),
    ('Demo — Furniture layout — reception', (select id from public.project_offices where ref='DEMO-PRJ-04'), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 8, v_associate_id),
    ('Demo — Vendor RFQ — joinery', (select id from public.project_offices where ref='DEMO-PRJ-04'), null, 'TODO', 'MEDIUM', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 3, v_associate_id),
    ('Demo — On-hold status client call', (select id from public.project_offices where ref='DEMO-PRJ-05'), v_senior_id, 'TODO', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date + 30, v_senior_id),
    ('Demo — GFC drawings — tower A', (select id from public.project_offices where ref='DEMO-PRJ-06'), v_partner_id, 'IN_PROGRESS', 'CRITICAL', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 1, v_partner_id),
    ('Demo — Facade mock-up review', (select id from public.project_offices where ref='DEMO-PRJ-06'), v_senior_id, 'TODO', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 6, v_partner_id),
    ('Demo — Fire NOC coordination', (select id from public.project_offices where ref='DEMO-PRJ-06'), null, 'BLOCKED', 'CRITICAL', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 4, v_partner_id),
    ('Demo — Structural peer review', (select id from public.project_offices where ref='DEMO-PRJ-06'), v_associate_id, 'TODO', 'HIGH', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 8, v_partner_id),
    ('Demo — Handover documentation archive', (select id from public.project_offices where ref='DEMO-PRJ-07'), v_owner_id, 'DONE', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date - 30, v_owner_id),
    ('Demo — Defect liability walkthrough', (select id from public.project_offices where ref='DEMO-PRJ-07'), v_senior_id, 'DONE', 'MEDIUM', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 15, v_owner_id),
    ('Demo — Kitchen layout — back of house', (select id from public.project_offices where ref='DEMO-PRJ-08'), v_associate_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 5, v_partner_id),
    ('Demo — Guest room typical unit — RCP', (select id from public.project_offices where ref='DEMO-PRJ-08'), v_associate_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 12, v_partner_id),
    ('Demo — Lighting consultant coordination', (select id from public.project_offices where ref='DEMO-PRJ-08'), v_senior_id, 'BLOCKED', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 6, v_partner_id),
    ('Demo — Fire safety compliance check', (select id from public.project_offices where ref='DEMO-PRJ-08'), null, 'TODO', 'CRITICAL', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date - 3, v_partner_id),
    ('Demo — Renovation demolition plan', (select id from public.project_offices where ref='DEMO-PRJ-09'), v_associate_id, 'DONE', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date - 10, v_associate_id),
    ('Demo — Structural opening approvals', (select id from public.project_offices where ref='DEMO-PRJ-09'), v_senior_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'CONSTRUCTION_SUPPORT', current_date + 4, v_associate_id),
    ('Demo — Client selection — flooring', (select id from public.project_offices where ref='DEMO-PRJ-09'), null, 'TODO', 'LOW', 'BILLABLE', 'DESIGN_COMMUNICATION', null, v_associate_id),
    ('Demo — Corporate park massing study', (select id from public.project_offices where ref='DEMO-PRJ-10'), v_owner_id, 'IN_PROGRESS', 'HIGH', 'BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 7, v_owner_id),
    ('Demo — Parking ratio compliance check', (select id from public.project_offices where ref='DEMO-PRJ-10'), v_partner_id, 'TODO', 'MEDIUM', 'BILLABLE', 'TECHNICAL_PRODUCTION', current_date + 15, v_owner_id),
    ('Demo — Clubhouse condition survey', (select id from public.project_offices where ref='DEMO-PRJ-11'), v_senior_id, 'TODO', 'MEDIUM', 'NON_BILLABLE', 'DESIGN_DEVELOPMENT', current_date + 9, v_senior_id),
    ('Demo — RWA committee presentation', (select id from public.project_offices where ref='DEMO-PRJ-11'), v_owner_id, 'TODO', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date + 20, v_senior_id),
    ('Demo — Landscape scope closeout note', (select id from public.project_offices where ref='DEMO-PRJ-12'), v_associate_id, 'DONE', 'LOW', 'NON_BILLABLE', 'DESIGN_COMMUNICATION', current_date - 60, v_owner_id);

  -- One real dependency chain on the busiest project — the site-visit
  -- report is blocked on the client walkthrough happening first.
  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type)
  select t1.id, t2.id, 'BLOCKS'
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Site visit report' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-01')
    and t2.title = 'Demo — Client walkthrough — Phase 1' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-01');

  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type)
  select t1.id, t2.id, 'BLOCKS'
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Fire NOC coordination' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-06')
    and t2.title = 'Demo — Structural peer review' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-06');

  insert into public.task_dependencies (task_id, depends_on_task_id, dependency_type)
  select t1.id, t2.id, 'APPROVAL'
  from public.tasks t1, public.tasks t2
  where t1.title = 'Demo — Lighting consultant coordination' and t1.project_id = (select id from public.project_offices where ref='DEMO-PRJ-08')
    and t2.title = 'Demo — Fire safety compliance check' and t2.project_id = (select id from public.project_offices where ref='DEMO-PRJ-08');

  -- ── Invoices (DRAFT / ISSUED-unpaid / ISSUED-partial / PAID) ───────
  insert into public.invoices (ref, project_id, client_id, status, gst_system, document_kind, inter_state, tds_applicable, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, tds_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice) values
    ('DEMO-INV-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 50000000, 4500000, 4500000, 0, 9000000, 0, 59000000, 59000000, 59000000, current_date - 60),
    ('DEMO-INV-02', (select id from public.project_offices where ref='DEMO-PRJ-01'), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 65000000, 5850000, 5850000, 0, 11700000, 0, 76700000, 76700000, 30000000, current_date - 20),
    ('DEMO-INV-03', (select id from public.project_offices where ref='DEMO-PRJ-01'), (select id from public.clients where name='Demo — Aurelia Developers Pvt Ltd'), 'DRAFT', 'REGULAR', 'TAX_INVOICE', false, false, 42000000, 3780000, 3780000, 0, 7560000, 0, 49560000, 49560000, 0, null),
    ('DEMO-INV-04', (select id from public.project_offices where ref='DEMO-PRJ-04'), (select id from public.clients where name='Demo — Kavya Interiors LLP'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 18000000, 1620000, 1620000, 0, 3240000, 0, 21240000, 21240000, 21240000, current_date - 40),
    ('DEMO-INV-05', (select id from public.project_offices where ref='DEMO-PRJ-06'), (select id from public.clients where name='Demo — Silver Oak Builders'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, true, 220000000, 19800000, 19800000, 0, 39600000, 4400000, 259600000, 255200000, 100000000, current_date - 10),
    ('DEMO-INV-06', (select id from public.project_offices where ref='DEMO-PRJ-07'), (select id from public.clients where name='Demo — Dr. Suresh Iyer'), 'PAID', 'REGULAR', 'TAX_INVOICE', true, false, 31000000, 0, 0, 5580000, 5580000, 0, 36580000, 36580000, 36580000, current_date - 90),
    ('DEMO-INV-07', (select id from public.project_offices where ref='DEMO-PRJ-08'), (select id from public.clients where name='Demo — Greenfield Hospitality Pvt Ltd'), 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, true, 180000000, 16200000, 16200000, 0, 32400000, 3600000, 212400000, 208800000, 0, current_date - 5),
    ('DEMO-INV-08', (select id from public.project_offices where ref='DEMO-PRJ-09'), (select id from public.clients where name='Demo — Ananya & Kabir Menon'), 'DRAFT', 'REGULAR', 'TAX_INVOICE', false, false, 14000000, 1260000, 1260000, 0, 2520000, 0, 16520000, 16520000, 0, null);

  -- ── Proposals ───────────────────────────────────────────────────────
  insert into public.proposals (ref, project_id, status, work_category, work_type, fee_basis, cost_of_works_paise, fee_paise, client_approval_status, client_approved_at) values
    ('DEMO-PRP-01', (select id from public.project_offices where ref='DEMO-PRJ-03'), 'SENT', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 180000000, 10800000, 'PENDING', null),
    ('DEMO-PRP-02', (select id from public.project_offices where ref='DEMO-PRJ-10'), 'SENT', 'Architectural Design Services', 'ARCHITECTURE', 'PER_SQM', 6800000000, 340000000, 'PENDING', null),
    ('DEMO-PRP-03', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'APPROVED', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 850000000, 51000000, 'APPROVED', now() - interval '100 days'),
    ('DEMO-PRP-04', (select id from public.project_offices where ref='DEMO-PRJ-04'), 'APPROVED', 'Interior Design Services', 'INTERIOR', 'LUMPSUM', 95000000, 12000000, 'APPROVED', now() - interval '40 days'),
    ('DEMO-PRP-05', (select id from public.project_offices where ref='DEMO-PRJ-11'), 'DRAFT', 'Architectural Design Services', 'ARCHITECTURE', 'COA_PERCENT', 220000000, 13200000, 'PENDING', null);

  -- ── Leads ───────────────────────────────────────────────────────────
  insert into public.leads (ref, client_name, lead_source, project_type, city, status, assigned_to_id) values
    ('DEMO-LEAD-01', 'Demo — Kavya Interiors Enquiry', 'Website', 'Interior', 'Bengaluru', 'CONTACTED', v_associate_id),
    ('DEMO-LEAD-02', 'Demo — Whitefield Apartments RWA', 'Referral', 'Institutional', 'Bengaluru', 'NEW', null),
    ('DEMO-LEAD-03', 'Demo — Coastal Weekend Villa Enquiry', 'Instagram', 'Residential', 'Mangaluru', 'ASSESSMENT_STARTED', v_senior_id),
    ('DEMO-LEAD-04', 'Demo — Retail Store Fit-out Chain', 'Referral', 'Commercial', 'Bengaluru', 'QUALIFIED', v_partner_id);

  -- ── Decisions (CRIF register) — spans every state/impact combo ──────
  insert into public.decisions (project_id, title, rationale, state, revision_category, revision_source, impact, owner_name, review_deadline, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Facade material: fibre-cement vs. exposed brick',
      'After reviewing three facade material samples with the client, the team recommends textured grey fibre-cement cladding panels over exposed brick for better weather resistance and lower long-term maintenance given the site''s coastal-adjacent microclimate.',
      'CLIENT_REVIEW', 'MAJOR', 'CLIENT_DRIVEN', 'HIGH', 'Ar. Aditi Rao', current_date + 7, v_owner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Podium slab redesign for parking ramp clearance',
      'The structural consultant flagged insufficient headroom clearance on the originally drawn podium slab for the parking ramp; the slab has been redesigned with a revised beam depth to restore the required 2.4m clearance.',
      'CLIENT_REVIEW', 'CRITICAL', 'TECHNICAL_QUERY', 'HIGH', 'Ar. Vikram Shah', current_date + 3, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-08'), 'Demo — Kitchen exhaust routing relocated',
      'The back-of-house kitchen exhaust duct routing conflicted with a structural beam; the MEP consultant proposed rerouting through the adjacent service shaft, adding minor cost but no schedule impact.',
      'ACCEPTED', 'MINOR', 'TECHNICAL_QUERY', 'MEDIUM', 'Ar. Vikram Shah', null, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-04'), 'Demo — Reception counter material downgrade',
      'To stay within the approved budget, the reception counter finish was changed from natural stone to an engineered quartz alternative with a comparable appearance.',
      'LOCKED', 'MINOR', 'SCOPE_CHANGE', 'LOW', 'Priya Nair', null, v_associate_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-09'), 'Demo — Structural opening size for renovation',
      'Draft note pending structural consultant sign-off on the proposed 1.2m wide structural opening for the renovated living-dining connection.',
      'DRAFT', null, null, 'MEDIUM', 'Priya Nair', current_date + 12, v_associate_id);

  -- ── Meeting minutes (real free-text content, for Pulse RAG search) ──
  insert into public.moms (ref, project_id, title, meeting_date, venue, attendees, minutes, status) values
    ('DEMO-MOM-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Facade material review meeting', current_date - 6, 'Site office, Bengaluru', 'Ar. Aditi Rao, Client representative, Ar. Nitin Kamath',
      'The team presented three facade material samples to the client: exposed brick, textured grey fibre-cement cladding, and a natural stone veneer. After discussion of long-term maintenance in the site''s humid microclimate and weather resistance, the client agreed to proceed with the fibre-cement cladding option. The stone veneer was ruled out due to cost, and exposed brick was ruled out due to maintenance concerns raised by the client''s facilities team. Next steps: issue a formal decision note and update the elevation drawings accordingly.',
      'ISSUED'),
    ('DEMO-MOM-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Podium parking clearance coordination', current_date - 3, 'Aurelia site office', 'Ar. Vikram Shah, Structural consultant, Site engineer',
      'The structural consultant raised a clearance conflict on the podium slab affecting the parking ramp headroom. The team reviewed two options — lowering the ramp gradient or redesigning the slab beam depth — and agreed the beam redesign was preferable since it does not affect the approved ramp gradient in the sanctioned drawings. The structural consultant will issue revised structural drawings within one week.',
      'ISSUED'),
    ('DEMO-MOM-03', (select id from public.project_offices where ref='DEMO-PRJ-08'), 'Demo — Kitchen MEP coordination meeting', current_date - 8, 'Virtual (Google Meet)', 'Ar. Vikram Shah, MEP consultant, Kitchen equipment vendor',
      'The kitchen exhaust duct routing was found to clash with a structural transfer beam above the back-of-house corridor. The MEP consultant proposed rerouting the duct through the adjacent service shaft instead, which the structural consultant confirmed has adequate capacity. The kitchen equipment vendor confirmed the revised routing does not affect equipment placement. Agreed to proceed with the rerouted duct design.',
      'DRAFT');

  -- ── Progress reports (real narrative content, for Pulse RAG search) ─
  insert into public.progress_reports (project_id, period_start, period_end, narrative, physical_progress_pct, schedule_progress_pct, open_snag_count, open_rfi_count, status, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01'), current_date - 30, current_date, 'Structural work for the ground and first floor slabs is complete. Brickwork has commenced on the ground floor. The facade material decision was finalised this period after client review, and elevation drawings are being updated to reflect the approved fibre-cement cladding. Site visit reports flagged minor water pooling near the north boundary wall, which the contractor has been asked to address before the next monsoon.',
      35, 30, 2, 1, 'ISSUED', v_owner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), current_date - 25, current_date - 1, 'Tower A structural frame has reached the 6th floor. The podium slab redesign for parking ramp clearance was approved this period and revised structural drawings have been issued to the contractor. Facade mock-up panels were installed on site for client review; feedback is pending. Fire NOC coordination remains open pending the fire consultant''s revised layout submission.',
      42, 38, 4, 3, 'ISSUED', v_partner_id);

  -- ═══════════════════════════════════════════════════════════════════
  -- New this migration (0042): everything below is additive, extending
  -- coverage into the ~25 modules 0041 never touched.
  -- ═══════════════════════════════════════════════════════════════════

  -- ── Rate Books + items ──────────────────────────────────────────────
  insert into public.rate_books (name, version_label, effective_date, description, locked) values
    ('Demo — AORMS Standard Rate Book 2026', 'v2026.1', current_date - 180, 'Firm-standard civil, finishing, and MEP item rates for residential/commercial work.', false),
    ('Demo — Interior Fit-out Rate Book 2026', 'v2026.1', current_date - 90, 'Interior fit-out specific item rates — joinery, flooring, false ceiling.', true);

  insert into public.rate_book_items (rate_book_id, sort_order, item_code, description, specification, unit, rate_paise) values
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 1, 'CIV-001', 'RCC M25 grade concrete', 'Footing / foundation, machine mixed', 'cum', 850000),
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 2, 'CIV-002', 'Brickwork in cement mortar 1:6', '230mm thick wall', 'cum', 450000),
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 3, 'FIN-001', 'Vitrified tile flooring', '600x600mm, matte finish', 'sqm', 180000),
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 4, 'FIN-002', 'Internal wall painting', 'Two coats premium emulsion over primer', 'sqm', 6500),
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 5, 'MEP-001', 'Concealed electrical wiring point', 'Light/plug point, PVC conduit concealed', 'nos', 85000),
    ((select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 6, 'MEP-002', 'CPVC plumbing point', 'Water supply point, concealed', 'nos', 120000),
    ((select id from public.rate_books where name='Demo — Interior Fit-out Rate Book 2026'), 1, 'INT-001', 'Modular wardrobe', 'Laminate finish, BWP ply carcass', 'sqft', 220000),
    ((select id from public.rate_books where name='Demo — Interior Fit-out Rate Book 2026'), 2, 'INT-002', 'False ceiling', 'Gypsum board with cove lighting recess', 'sqft', 15000),
    ((select id from public.rate_books where name='Demo — Interior Fit-out Rate Book 2026'), 3, 'INT-003', 'Engineered wood flooring', 'Click-lock, oak finish', 'sqft', 35000),
    ((select id from public.rate_books where name='Demo — Interior Fit-out Rate Book 2026'), 4, 'INT-004', 'Modular kitchen', 'Per running foot, base + wall unit', 'rft', 850000);

  -- ── Estimates + items ────────────────────────────────────────────────
  insert into public.estimates (ref, project_id, rate_book_id, title, date, status, contingency_pct, gst_pct, notes) values
    ('DEMO-EST-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), (select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 'Demo — Aurelia Residences Phase 1 — Priced BOQ v1', current_date - 60, 'FINALISED', 5, 18, 'Finalised BOQ used for the approved fee proposal baseline.'),
    ('DEMO-EST-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), (select id from public.rate_books where name='Demo — AORMS Standard Rate Book 2026'), 'Demo — Silver Oak Commercial Complex — Priced BOQ v1', current_date - 10, 'DRAFT', 7, 18, 'Draft — pending structural quantity revision after podium redesign.'),
    ('DEMO-EST-03', (select id from public.project_offices where ref='DEMO-PRJ-04'), (select id from public.rate_books where name='Demo — Interior Fit-out Rate Book 2026'), 'Demo — Kavya Interiors Studio Fit-out — Priced BOQ v1', current_date - 40, 'APPROVED', 5, 18, 'Approved against the interior fit-out rate book.');

  insert into public.estimate_items (estimate_id, sort_order, item_code, description, unit, quantity, rate_paise, amount_paise) values
    ((select id from public.estimates where ref='DEMO-EST-01'), 1, 'CIV-001', 'RCC M25 grade concrete — footing/foundation', 'cum', 120, 850000, 102000000),
    ((select id from public.estimates where ref='DEMO-EST-01'), 2, 'CIV-002', 'Brickwork in cement mortar 1:6 — 230mm wall', 'cum', 850, 450000, 382500000),
    ((select id from public.estimates where ref='DEMO-EST-01'), 3, 'FIN-001', 'Vitrified tile flooring 600x600mm', 'sqm', 420, 180000, 75600000),
    ((select id from public.estimates where ref='DEMO-EST-01'), 4, 'FIN-002', 'Internal wall painting — two coats emulsion', 'sqm', 1800, 6500, 11700000),
    ((select id from public.estimates where ref='DEMO-EST-01'), 5, 'MEP-001', 'Concealed electrical wiring — per point', 'nos', 180, 85000, 15300000),
    ((select id from public.estimates where ref='DEMO-EST-02'), 1, 'CIV-001', 'RCC M25 grade concrete — foundation & podium', 'cum', 300, 850000, 255000000),
    ((select id from public.estimates where ref='DEMO-EST-02'), 2, 'CIV-002', 'Brickwork in cement mortar 1:6', 'cum', 2200, 450000, 990000000),
    ((select id from public.estimates where ref='DEMO-EST-02'), 3, 'MEP-002', 'CPVC plumbing — per point', 'nos', 240, 120000, 28800000),
    ((select id from public.estimates where ref='DEMO-EST-03'), 1, 'INT-001', 'Modular wardrobe — laminate finish', 'sqft', 85, 220000, 18700000),
    ((select id from public.estimates where ref='DEMO-EST-03'), 2, 'INT-002', 'False ceiling — gypsum board with cove lighting', 'sqft', 620, 15000, 9300000),
    ((select id from public.estimates where ref='DEMO-EST-03'), 3, 'INT-004', 'Modular kitchen — per running foot', 'rft', 32, 850000, 27200000);

  -- ── Spec Sheets + items ──────────────────────────────────────────────
  insert into public.spec_sheets (ref, project_id, title, version_no, status, revision_note) values
    ('DEMO-SPEC-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Aurelia Residences Phase 1 — Material Spec Sheet', 2, 'ISSUED', 'Updated flooring spec per client selection'),
    ('DEMO-SPEC-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Silver Oak Commercial Complex — Material Spec Sheet', 1, 'DRAFT', null),
    ('DEMO-SPEC-03', (select id from public.project_offices where ref='DEMO-PRJ-04'), 'Demo — Kavya Interiors Studio Fit-out — Material Spec Sheet', 1, 'ISSUED', null);

  insert into public.spec_items (spec_sheet_id, sort_order, category, item, make, specification, finish) values
    ((select id from public.spec_sheets where ref='DEMO-SPEC-01'), 1, 'Flooring', 'Living room flooring', 'Kajaria', 'Vitrified tile 600x600', 'Matte'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-01'), 2, 'Paint', 'Interior wall paint', 'Asian Paints', 'Royale Luxury Emulsion', 'Matte'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-01'), 3, 'Sanitaryware', 'Master bath WC', 'Kohler', 'Wall-hung', 'White'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-02'), 1, 'Facade', 'Cladding panel', 'Everest', 'Fibre cement board 8mm', 'Textured grey'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-02'), 2, 'Glazing', 'Curtain wall glass', 'Saint-Gobain', 'Double glazed unit', 'Clear low-E'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-03'), 1, 'Joinery', 'Wardrobe shutters', 'Century Ply', 'BWP grade plywood, laminate finish', 'Matte laminate'),
    ((select id from public.spec_sheets where ref='DEMO-SPEC-03'), 2, 'Countertop', 'Reception counter', 'Caesarstone', 'Engineered quartz', 'Polished');

  -- ── Drawings ─────────────────────────────────────────────────────────
  insert into public.drawings (ref, project_id, title, file_name, file_hash, storage_key, size_bytes, status, svg_key, entity_count, rev_no, review_status, reviewed_by_id, reviewed_at, error_text) values
    ('DEMO-DWG-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Ground Floor Plan — Working Drawing', 'aurelia-p1-gf-plan-r2.dxf', 'demo-hash-0001', 'demo/drawings/aurelia-p1-gf-plan-r2.dxf', 245678, 'READY', 'demo/drawings/aurelia-p1-gf-plan-r2.svg', 842, 2, 'APPROVED', v_senior_id, now() - interval '5 days', null),
    ('DEMO-DWG-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Tower A GFC Structural Drawing', 'silveroak-towerA-gfc-r1.dxf', 'demo-hash-0002', 'demo/drawings/silveroak-towerA-gfc-r1.dxf', 512340, 'READY', 'demo/drawings/silveroak-towerA-gfc-r1.svg', 1560, 1, 'PENDING_REVIEW', null, null, null),
    ('DEMO-DWG-03', (select id from public.project_offices where ref='DEMO-PRJ-08'), 'Demo — Kitchen Back-of-House Layout', 'greenfield-kitchen-boh-r1.dxf', 'demo-hash-0003', 'demo/drawings/greenfield-kitchen-boh-r1.dxf', 98234, 'PENDING', null, 0, 1, 'PENDING_REVIEW', null, null, null),
    ('DEMO-DWG-04', (select id from public.project_offices where ref='DEMO-PRJ-04'), 'Demo — Reception Fit-out Detail', 'kavya-reception-detail-r1.dxf', 'demo-hash-0004', 'demo/drawings/kavya-reception-detail-r1.dxf', 45210, 'FAILED', null, 0, 1, 'PENDING_REVIEW', null, null, 'Unsupported DXF version (AC1032) — please re-export as AC1027 or earlier.');

  -- ── Transmittals ─────────────────────────────────────────────────────
  insert into public.transmittals (ref, project_id, recipient, purpose, channel, date_issued, acknowledged_at, acknowledged_by, pdf_status, created_by_id) values
    ('DEMO-TRN-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Aurelia Developers Pvt Ltd', 'Issue for construction — GF plan revision 2', 'Email', current_date - 5, now() - interval '3 days', 'Site Engineer, Aurelia Developers', 'NONE', v_owner_id),
    ('DEMO-TRN-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Ironclad Structural Steel', 'Issue revised structural drawings — podium beam redesign', 'Email', current_date - 3, null, null, 'NONE', v_partner_id),
    ('DEMO-TRN-03', (select id from public.project_offices where ref='DEMO-PRJ-04'), 'Demo — Kavya Interiors LLP', 'Issue reception counter shop drawing for approval', 'WhatsApp', current_date - 2, now() - interval '1 day', 'Kavya Interiors design lead', 'NONE', v_associate_id);

  -- ── Contracts ────────────────────────────────────────────────────────
  insert into public.contracts (ref, project_id, title, party, contract_type, value_paise, start_date, end_date, status, notes) values
    ('DEMO-CTR-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Architectural Services Agreement', 'Demo — Aurelia Developers Pvt Ltd', 'CLIENT', 85000000, current_date - 120, null, 'ACTIVE', null),
    ('DEMO-CTR-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Structural Steel Supply & Erection', 'Demo — Ironclad Structural Steel', 'CONTRACTOR', 320000000, current_date - 55, null, 'ACTIVE', null),
    ('DEMO-CTR-03', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Structural Consulting Engagement', 'Demo — Ar. Nitin Kamath', 'CONSULTANT', 9500000, current_date - 118, null, 'ACTIVE', null),
    ('DEMO-CTR-04', null, 'Demo — Office Lease Agreement', 'Prestige Tech Park Management', 'VENDOR', 18000000, current_date - 400, current_date + 600, 'ACTIVE', 'Firm office lease — not project-linked.');

  -- ── Letters ──────────────────────────────────────────────────────────
  insert into public.letters (ref, project_id, recipient, subject, body, date_letter, pdf_status) values
    ('DEMO-LTR-01', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Silver Oak Builders', 'Fire NOC coordination — revised layout submission required', 'Dear Sir, further to our site meeting, we request the revised fire layout be submitted at the earliest to avoid delay to the Fire NOC approval. Kindly treat this as urgent.', current_date - 8, 'NONE'),
    ('DEMO-LTR-02', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Aurelia Developers Pvt Ltd', 'Facade material decision confirmation', 'This letter confirms the client''s approval of the fibre-cement cladding option discussed in our facade material review meeting. Elevation drawings will be updated accordingly.', current_date - 6, 'NONE'),
    ('DEMO-LTR-03', (select id from public.project_offices where ref='DEMO-PRJ-08'), 'Demo — Greenfield Hospitality Pvt Ltd', 'Kitchen MEP coordination update', 'We are pleased to confirm the kitchen exhaust routing conflict has been resolved via rerouting through the adjacent service shaft, with no impact to the project schedule.', current_date - 4, 'NONE');

  -- ── Document issues (referencing the spec sheet / transmittal /
  --     letter created above) ────────────────────────────────────────
  insert into public.document_issues (entity_type, entity_id, project_id, ref, version_no, revision_note, impact_note, issued_at, issued_by_id) values
    ('SPEC_SHEET', (select id from public.spec_sheets where ref='DEMO-SPEC-01'), (select id from public.project_offices where ref='DEMO-PRJ-01'), 'DEMO-DOC-01', 2, 'Updated flooring spec per client selection', 'Flooring subcontractor to re-quote against revised spec.', now() - interval '10 days', v_owner_id),
    ('LETTER', (select id from public.letters where ref='DEMO-LTR-01'), (select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-DOC-02', 1, null, null, now() - interval '8 days', v_partner_id),
    ('CONTRACT', (select id from public.contracts where ref='DEMO-CTR-01'), (select id from public.project_offices where ref='DEMO-PRJ-01'), 'DEMO-DOC-03', 1, null, 'Agreement executed — architectural services scope locked.', now() - interval '120 days', v_owner_id),
    ('TRANSMITTAL', (select id from public.transmittals where ref='DEMO-TRN-01'), (select id from public.project_offices where ref='DEMO-PRJ-01'), 'DEMO-DOC-04', 1, null, null, now() - interval '5 days', v_owner_id);

  -- ── BBS (schedule + members + items) ────────────────────────────────
  insert into public.bbs_schedules (ref, project_id, title, status, created_by_id) values
    ('DEMO-BBS-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Ground Floor Slab & Beam BBS', 'ISSUED', v_associate_id),
    ('DEMO-BBS-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Tower A Column BBS', 'DRAFT', v_partner_id);

  insert into public.bbs_members (bbs_id, element, mark, input, sort_order) values
    ((select id from public.bbs_schedules where ref='DEMO-BBS-01'), 'Beam', 'B1', '{}'::jsonb, 1),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-01'), 'Slab', 'S1', '{}'::jsonb, 2),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-02'), 'Column', 'C1', '{}'::jsonb, 1);

  insert into public.bbs_items (bbs_id, bar_mark, member, element, role, dia_mm, no_of_members, bars_per_member, cutting_length_mm, weight_kg, floor, shape) values
    ((select id from public.bbs_schedules where ref='DEMO-BBS-01'), '1', 'B1', 'Beam', 'Main bar', 16, 4, 4, 6200, 78.4, 'Ground', 'Straight'),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-01'), '2', 'B1', 'Beam', 'Stirrup', 8, 4, 24, 1400, 33.1, 'Ground', 'Rectangular stirrup'),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-01'), '3', 'S1', 'Slab', 'Main bar', 10, 1, 45, 4200, 116.6, 'Ground', 'Straight'),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-02'), '1', 'C1', 'Column', 'Main bar', 20, 8, 8, 3600, 227.6, 'Ground to 6th', 'Straight with hook'),
    ((select id from public.bbs_schedules where ref='DEMO-BBS-02'), '2', 'C1', 'Column', 'Tie', 8, 8, 30, 1800, 53.3, 'Ground to 6th', 'Rectangular tie');

  -- ── Snags ────────────────────────────────────────────────────────────
  insert into public.snags (project_id, ref, location, trade, description, status, due_date, closed_at) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01'), 'DEMO-SNAG-01', 'Living room, north wall', 'Painting', 'Uneven paint finish near window frame', 'OPEN', current_date + 5, null),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-SNAG-02', 'Tower A, Level 3 lobby', 'Flooring', 'Tile lippage exceeds tolerance near lift lobby', 'IN_PROGRESS', current_date + 3, null),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-SNAG-03', 'Tower A, Level 2 washroom', 'Plumbing', 'Leak at CP fitting joint', 'VERIFIED', current_date - 2, null),
    ((select id from public.project_offices where ref='DEMO-PRJ-08'), 'DEMO-SNAG-04', 'Guest room 204', 'Electrical', 'Switch plate misaligned', 'CLOSED', current_date - 10, now() - interval '8 days'),
    ((select id from public.project_offices where ref='DEMO-PRJ-04'), 'DEMO-SNAG-05', 'Reception area', 'Carpentry', 'Reception counter edge banding peeling', 'OPEN', current_date + 7, null);

  -- ── Site instructions ────────────────────────────────────────────────
  insert into public.site_instructions (ref, project_id, contractor_id, subject, body, issued_at, acknowledged_at, created_by_id) values
    ('DEMO-SI-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), (select id from public.contractors where name='Demo — Balaji Civil Works'), 'Waterproofing rectification — north boundary wall', 'Please rectify water pooling near the north boundary wall as flagged in the latest site visit report, before the next monsoon.', current_date - 10, now() - interval '9 days', v_owner_id),
    ('DEMO-SI-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), (select id from public.contractors where name='Demo — Ironclad Structural Steel'), 'Podium slab beam depth revision', 'Proceed with the revised beam depth per the updated structural drawings issued this week.', current_date - 5, null, v_partner_id),
    ('DEMO-SI-03', (select id from public.project_offices where ref='DEMO-PRJ-08'), (select id from public.contractors where name='Demo — Precision MEP Systems'), 'Kitchen exhaust duct rerouting', 'Reroute the kitchen exhaust duct through the adjacent service shaft per the MEP coordination meeting.', current_date - 6, now() - interval '4 days', v_partner_id);

  -- ── Purchase orders + items ──────────────────────────────────────────
  insert into public.purchase_orders (ref, project_id, vendor, title, status, date_po, total_paise) values
    ('DEMO-PO-01', (select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Balaji Civil Works', 'Cement & steel procurement — GF slab', 'ISSUED', current_date - 45, 62160000),
    ('DEMO-PO-02', (select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Precision MEP Systems', 'HVAC ducting materials', 'DRAFT', current_date - 5, 59200000),
    ('DEMO-PO-03', (select id from public.project_offices where ref='DEMO-PRJ-04'), 'Demo — Studio Finesse Interiors', 'Joinery materials — reception & wardrobes', 'ISSUED', current_date - 20, 23100000);

  insert into public.po_items (po_id, sort_order, description, unit, qty, rate_paise, amount_paise) values
    ((select id from public.purchase_orders where ref='DEMO-PO-01'), 1, 'OPC 53 grade cement — 50kg bags', 'bags', 800, 42000, 33600000),
    ((select id from public.purchase_orders where ref='DEMO-PO-01'), 2, 'TMT bars Fe500 — 12mm', 'kg', 4200, 6800, 28560000),
    ((select id from public.purchase_orders where ref='DEMO-PO-02'), 1, 'GI ducting sheet — 24 gauge', 'sqm', 320, 185000, 59200000),
    ((select id from public.purchase_orders where ref='DEMO-PO-03'), 1, 'BWP plywood 19mm', 'sheets', 45, 320000, 14400000),
    ((select id from public.purchase_orders where ref='DEMO-PO-03'), 2, 'Laminate sheets — matte finish', 'sheets', 60, 145000, 8700000);

  -- ── Tenders ──────────────────────────────────────────────────────────
  insert into public.tenders (project_id, title, category, scope, status, due_date, awarded_contractor_id, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Structural Steel Supply & Erection Tender', 'Structural Steel', 'Supply and erection of structural steel for Tower A.', 'AWARDED', current_date - 30, (select id from public.contractors where name='Demo — Ironclad Structural Steel'), v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-08'), 'Demo — MEP Package Tender', 'MEP Contractor', 'HVAC, electrical, and plumbing package for the boutique hotel.', 'OPEN', current_date + 10, null, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Civil Works Tender — Phase 1', 'Civil Contractor', 'RCC and masonry works for Phase 1.', 'CLOSED', current_date - 60, null, v_owner_id);

  -- ── Master Plans ─────────────────────────────────────────────────────
  insert into public.master_plans (name, category, file_key, file_name, file_type, version, notes, uploaded_by_id) values
    ('Demo — Bengaluru Zonal Master Plan 2031', 'PDF', 'demo/master-plans/bengaluru-zonal-2031.pdf', 'bengaluru-zonal-2031.pdf', 'application/pdf', 1, 'BBMP zonal regulations reference for active Bengaluru projects.', v_owner_id),
    ('Demo — Aurelia Township Layout Plan', 'DWG', 'demo/master-plans/aurelia-township-layout.dwg', 'aurelia-township-layout.dwg', 'application/dwg', 3, 'Approved layout plan for the Aurelia Residences township.', v_owner_id);

  -- ── Standards ────────────────────────────────────────────────────────
  insert into public.standards (discipline, title, notes) values
    ('Structural', 'Demo — IS 456:2000 Design Aid Summary', 'Internal quick-reference summary for RCC design checks.'),
    ('MEP', 'Demo — Firm MEP Coordination Checklist', 'Standard checklist used at every MEP coordination meeting.'),
    ('Architecture', 'Demo — Universal Accessibility Design Standard', 'In-house accessibility standard applied across all projects.');

  -- ── Compliance (one representative row per sub-table) ───────────────
  insert into public.compliance_far (zone, plot_type, plot_area_min_sqm, plot_area_max_sqm, far, ground_coverage_pct, max_height_m, notes) values
    ('Demo — R1 Residential Zone (BBMP)', 'Residential', 0, 2400, 1.75, 60, 15, 'Reference FAR for BBMP R1 zone plots up to 2400 sqm.');

  insert into public.compliance_setback (zone, plot_type, frontage_min_m, frontage_max_m, front_m, rear_m, side1_m, side2_m, notes) values
    ('Demo — R1 Residential Zone (BBMP)', 'Residential', 0, 12, 3, 3, 1.5, 1.5, 'Minimum setbacks for plots up to 12m frontage.');

  insert into public.compliance_nbc (clause, title, requirement, applicability, notes) values
    ('Demo — NBC 2016 Part 4', 'Fire and Life Safety', 'Minimum staircase width and refuge area provisions for buildings above 15m.', 'All buildings > 15m height', 'Quick-reference clause used in the fire safety compliance checks.');

  insert into public.compliance_fire (building_type, height_band_m, requirement, refuge_area, staircase_width_m, notes) values
    ('Demo — High-rise Residential', '15-30', 'Refuge area required at every 4th floor.', '15 sqm minimum per refuge floor', 1.5, 'Applied to Silver Oak Commercial Complex fire safety review.');

  insert into public.compliance_regulation (authority, ref_no, title, summary, link, notes) values
    ('Demo — BBMP', 'BBMP/BLD/2019/45', 'Building Bye-laws 2019 — Zoning Regulations', 'Governs FAR, setbacks, and ground coverage for BBMP jurisdiction plots.', 'https://bbmp.gov.in', 'Primary regulation reference for all BBMP-jurisdiction demo projects.');

  -- ── Spec Catalog (versions + items) ──────────────────────────────────
  insert into public.spec_catalog_versions (label, description, active) values
    ('Demo — Spec Catalog 2026 v1', 'Current material specification catalogue.', true),
    ('Demo — Spec Catalog 2025 v2 (superseded)', 'Previous year''s catalogue, kept for reference.', false);

  insert into public.spec_catalog_items (version_id, category, item, make, specification, finish, sort_order) values
    ((select id from public.spec_catalog_versions where label='Demo — Spec Catalog 2026 v1'), 'Flooring', 'Vitrified tile', 'Kajaria', '600x600mm', 'Matte', 1),
    ((select id from public.spec_catalog_versions where label='Demo — Spec Catalog 2026 v1'), 'Paint', 'Interior emulsion', 'Asian Paints', 'Royale Luxury', 'Matte', 2),
    ((select id from public.spec_catalog_versions where label='Demo — Spec Catalog 2026 v1'), 'Sanitaryware', 'Wall-hung WC', 'Kohler', 'Standard', 'White', 3),
    ((select id from public.spec_catalog_versions where label='Demo — Spec Catalog 2026 v1'), 'Hardware', 'Door lock set', 'Godrej', 'Mortise lock, 3-key', 'Satin steel', 4);

  -- ── Lessons Learned ──────────────────────────────────────────────────
  insert into public.lessons_learned (project_id, title, category, body, recommendations, tags, status, author_id, author_name) values
    ((select id from public.project_offices where ref='DEMO-PRJ-01'), 'Demo — Early facade material mockups save late-stage rework', 'DESIGN', 'Presenting three physical facade material samples early in the design development stage let the client decide quickly and avoided a late elevation redesign.', 'Budget one week for physical material mockups before finalising elevation drawings on every project with a visible street-facing facade.', 'facade, client-approval, design-development', 'PUBLISHED', v_owner_id, 'Ar. Aditi Rao'),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'Demo — Confirm parking ramp clearances against structural drawings before GFC issue', 'COORDINATION', 'A podium slab beam depth clash with the parking ramp clearance was only caught after GFC drawings were partially issued, requiring a mid-construction slab redesign.', 'Add an explicit ramp-clearance check to the structural drawing review checklist before any GFC issue on projects with basement/podium parking.', 'structural, coordination, parking', 'PUBLISHED', v_partner_id, 'Ar. Vikram Shah');

  -- ── Knowledge Bank (repo_sources) ────────────────────────────────────
  insert into public.repo_sources (title, author, category, status, executive_summary, processed_at, published_at, created_by) values
    ('Demo — BBMP Building Bye-laws 2019 (Summary)', 'Ar. Aditi Rao', 'Regulation', 'PUBLISHED', 'A condensed internal summary of BBMP''s 2019 building bye-laws covering FAR, setbacks, and ground coverage relevant to the firm''s active Bengaluru projects.', now() - interval '30 days', now() - interval '28 days', v_owner_id),
    ('Demo — IS 456:2000 Quick Reference', 'Ar. Vikram Shah', 'Standard', 'PUBLISHED', 'Internal quick-reference notes on RCC design provisions used during structural coordination.', now() - interval '60 days', now() - interval '58 days', v_partner_id),
    ('Demo — Client Onboarding Playbook Draft', 'Priya Nair', 'Process', 'DRAFT', null, null, null, v_associate_id);

  -- ── Teams + memberships ──────────────────────────────────────────────
  insert into public.teams (name, description, active) values
    ('Demo — Design Team', 'Concept and design-development staff across active projects.', true),
    ('Demo — Site Delivery Team', 'Site supervision, contractor coordination, and delivery staff.', true);

  insert into public.team_memberships (team_id, team_member_id) values
    ((select id from public.teams where name='Demo — Design Team'), (select id from public.team_members where user_id=v_owner_id)),
    ((select id from public.teams where name='Demo — Design Team'), (select id from public.team_members where user_id=v_senior_id)),
    ((select id from public.teams where name='Demo — Design Team'), (select id from public.team_members where user_id=v_associate_id)),
    ((select id from public.teams where name='Demo — Site Delivery Team'), (select id from public.team_members where user_id=v_partner_id)),
    ((select id from public.teams where name='Demo — Site Delivery Team'), (select id from public.team_members where user_id=v_accountant_id));

  -- ── Office Templates ─────────────────────────────────────────────────
  insert into public.office_templates (kind, title, body, tags) values
    ('LETTER', 'Demo — Standard Client Cover Letter', 'Dear {{client_name}}, please find enclosed {{document_description}} for your review and records...', 'client, cover-letter'),
    ('CONTRACT', 'Demo — Standard Architectural Services Agreement Clause Set', 'This agreement is made between {{firm_name}} and {{client_name}} for architectural design services...', 'agreement, standard-clauses'),
    ('MOM', 'Demo — Standard Site Meeting Minutes Template', E'Project: {{project_title}}\nDate: {{meeting_date}}\nAttendees: {{attendees}}\n\nDiscussion points:\n1. ...', 'meeting, site-visit');

  -- ── Job Applications ─────────────────────────────────────────────────
  insert into public.job_applications (name, email, phone, applied_role, experience_years, current_employer, expected_salary_paise, status, notes) values
    ('Demo — Ravi Shankar', 'ravi.shankar.demo@example.com', '+91 90000 30001', 'Junior Architect', 1.5, 'Design Collaborative Bengaluru', 4500000, 'INTERVIEW', 'Strong portfolio, second interview scheduled.'),
    ('Demo — Meghana Rao', 'meghana.rao.demo@example.com', '+91 90000 30002', 'Site Engineer', 3.0, 'BuildTech Constructions', 5500000, 'APPLIED', null),
    ('Demo — Arvind Nambiar', 'arvind.nambiar.demo@example.com', '+91 90000 30003', 'Senior Architect', 6.0, 'Studio Line Architects', 9000000, 'HIRED', 'Offer accepted, joining next month.'),
    ('Demo — Fatima Sheikh', 'fatima.sheikh.demo@example.com', '+91 90000 30004', 'Interior Designer', 2.0, 'Freelance', 5000000, 'REJECTED', 'Portfolio not aligned with current project mix.');

  -- ── Payslips (last month paid, current month pending, all 5 staff) ──
  insert into public.payslips (team_member_id, month, gross_paise, deductions_paise, net_paise, paid, paid_date)
  select tm.id, to_char(current_date - interval '1 month', 'YYYY-MM'), tm.monthly_salary_paise, round(tm.monthly_salary_paise * 0.1), tm.monthly_salary_paise - round(tm.monthly_salary_paise * 0.1), true, (date_trunc('month', current_date) - interval '1 day')::date
  from public.team_members tm where tm.user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id);

  insert into public.payslips (team_member_id, month, gross_paise, deductions_paise, net_paise, paid, paid_date)
  select tm.id, to_char(current_date, 'YYYY-MM'), tm.monthly_salary_paise, round(tm.monthly_salary_paise * 0.1), tm.monthly_salary_paise - round(tm.monthly_salary_paise * 0.1), false, null
  from public.team_members tm where tm.user_id in (v_owner_id, v_partner_id, v_senior_id, v_associate_id, v_accountant_id);

  -- ── PMC Milestones ───────────────────────────────────────────────────
  insert into public.pmc_milestones (project_id, ref, title, planned_date, actual_date, percent_complete, status, sort_order, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-MS-01', 'Demo — Foundation & podium complete', current_date - 90, current_date - 85, 100, 'COMPLETE', 1, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-MS-02', 'Demo — Tower A structure top-out', current_date + 30, null, 60, 'ON_TRACK', 2, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-MS-03', 'Demo — Fire NOC approval', current_date - 5, null, 20, 'AT_RISK', 3, v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-08'), 'DEMO-MS-04', 'Demo — Kitchen MEP rough-in complete', current_date - 10, current_date - 12, 100, 'COMPLETE', 1, v_partner_id);

  -- ── PMC Packages ─────────────────────────────────────────────────────
  insert into public.pmc_packages (project_id, ref, title, trade, status, contractor_id, contract_value_paise, tender_close_date, award_date, bids_opened_at, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), 'DEMO-PKG-01', 'Demo — Structural Steel Package', 'Structural Steel', 'AWARDED', (select id from public.contractors where name='Demo — Ironclad Structural Steel'), 320000000, current_date - 35, current_date - 30, now() - interval '32 days', v_partner_id),
    ((select id from public.project_offices where ref='DEMO-PRJ-08'), 'DEMO-PKG-02', 'Demo — MEP Package', 'MEP Contractor', 'TENDERING', null, null, current_date + 10, null, null, v_partner_id);

  -- ── PMC Steel Certs ──────────────────────────────────────────────────
  insert into public.pmc_steel_certs (project_id, package_id, ref, period_start, period_end, status, issued_kg, consumed_kg, wastage_pct, narrative, certified_at, certified_by_id, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), (select id from public.pmc_packages where ref='DEMO-PKG-01'), 'DEMO-STC-01', current_date - 40, current_date - 10, 'SITE_CHECKED', 8500, 8120, 2.8, 'Reconciliation for Tower A ground to 3rd floor structural steel issued vs consumed.', null, null, v_partner_id);

  -- ── PMC RA Bills + lines ─────────────────────────────────────────────
  insert into public.pmc_ra_bills (project_id, package_id, ref, bill_no, period_start, period_end, status, gross_paise, advance_recovery_paise, retention_paise, other_deduction_paise, narrative, created_by_id) values
    ((select id from public.project_offices where ref='DEMO-PRJ-06'), (select id from public.pmc_packages where ref='DEMO-PKG-01'), 'DEMO-RA-01', 'RA-01', current_date - 40, current_date - 10, 'SITE_CHECKED', 44660000, 4466000, 2233000, 0, 'First running bill for structural steel package — ground to 3rd floor.', v_partner_id);

  insert into public.pmc_ra_lines (bill_id, sort_order, description, unit, previous_qty, this_qty, rate_paise, amount_paise) values
    ((select id from public.pmc_ra_bills where ref='DEMO-RA-01'), 1, 'Structural steel supply & erection — ground to 3rd floor', 'kg', 0, 8120, 550000, 44660000);

end;
$function$;

select public.reset_demo_data();
