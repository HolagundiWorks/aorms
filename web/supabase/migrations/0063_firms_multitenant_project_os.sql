-- Multi-tenancy, Batch 9/12 -- Project OS / precon / brief / BBS.
-- leads, project_dnas, pre_project_assessments, feasibility_reports,
-- project_negotiations, programs, program_spaces, client_onboardings,
-- project_risks, project_opportunities, project_phase_gates,
-- project_briefs, bbs_schedules, bbs_members, bbs_items. Uniform Pattern A.
-- feasibility_reports' public share-token route (app/api/feasibility/
-- [token]/route.ts) is service-role and token-authorized, not RLS-gated —
-- unaffected by this batch (see the plan's service-role paths section).

alter table public.leads add column firm_id uuid references public.firms (id);
update public.leads set firm_id = (select id from public.firms limit 1);
alter table public.leads
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index leads_firm_id_idx on public.leads (firm_id);
alter policy "leads: staff read" on public.leads
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "leads: staff write" on public.leads
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.project_dnas add column firm_id uuid references public.firms (id);
update public.project_dnas set firm_id = (select id from public.firms limit 1);
alter table public.project_dnas
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_dnas_firm_id_idx on public.project_dnas (firm_id);
alter policy "project_dnas: staff read" on public.project_dnas
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_dnas: write capability" on public.project_dnas
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pre_project_assessments add column firm_id uuid references public.firms (id);
update public.pre_project_assessments set firm_id = (select id from public.firms limit 1);
alter table public.pre_project_assessments
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pre_project_assessments_firm_id_idx on public.pre_project_assessments (firm_id);
alter policy "pre_project_assessments: staff read" on public.pre_project_assessments
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pre_project_assessments: write capability" on public.pre_project_assessments
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.feasibility_reports add column firm_id uuid references public.firms (id);
update public.feasibility_reports set firm_id = (select id from public.firms limit 1);
alter table public.feasibility_reports
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index feasibility_reports_firm_id_idx on public.feasibility_reports (firm_id);
alter policy "feasibility_reports: staff read" on public.feasibility_reports
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "feasibility_reports: write capability" on public.feasibility_reports
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.project_negotiations add column firm_id uuid references public.firms (id);
update public.project_negotiations set firm_id = (select id from public.firms limit 1);
alter table public.project_negotiations
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_negotiations_firm_id_idx on public.project_negotiations (firm_id);
alter policy "project_negotiations: staff read" on public.project_negotiations
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_negotiations: write capability" on public.project_negotiations
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.programs add column firm_id uuid references public.firms (id);
update public.programs set firm_id = (select id from public.firms limit 1);
alter table public.programs
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index programs_firm_id_idx on public.programs (firm_id);
alter policy "programs: staff read" on public.programs
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "programs: write capability" on public.programs
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.program_spaces add column firm_id uuid references public.firms (id);
update public.program_spaces set firm_id = (select id from public.firms limit 1);
alter table public.program_spaces
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index program_spaces_firm_id_idx on public.program_spaces (firm_id);
alter policy "program_spaces: staff read" on public.program_spaces
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "program_spaces: write capability" on public.program_spaces
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.client_onboardings add column firm_id uuid references public.firms (id);
update public.client_onboardings set firm_id = (select id from public.firms limit 1);
alter table public.client_onboardings
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index client_onboardings_firm_id_idx on public.client_onboardings (firm_id);
alter policy "client_onboardings: staff read" on public.client_onboardings
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "client_onboardings: write capability" on public.client_onboardings
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.project_risks add column firm_id uuid references public.firms (id);
update public.project_risks set firm_id = (select id from public.firms limit 1);
alter table public.project_risks
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_risks_firm_id_idx on public.project_risks (firm_id);
alter policy "project_risks: staff read" on public.project_risks
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_risks: write capability" on public.project_risks
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.project_opportunities add column firm_id uuid references public.firms (id);
update public.project_opportunities set firm_id = (select id from public.firms limit 1);
alter table public.project_opportunities
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_opportunities_firm_id_idx on public.project_opportunities (firm_id);
alter policy "project_opportunities: staff read" on public.project_opportunities
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_opportunities: write capability" on public.project_opportunities
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.project_phase_gates add column firm_id uuid references public.firms (id);
update public.project_phase_gates set firm_id = (select id from public.firms limit 1);
alter table public.project_phase_gates
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_phase_gates_firm_id_idx on public.project_phase_gates (firm_id);
alter policy "project_phase_gates: staff read" on public.project_phase_gates
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_phase_gates: write capability" on public.project_phase_gates
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.project_briefs add column firm_id uuid references public.firms (id);
update public.project_briefs set firm_id = (select id from public.firms limit 1);
alter table public.project_briefs
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index project_briefs_firm_id_idx on public.project_briefs (firm_id);
alter policy "project_briefs: staff read" on public.project_briefs
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "project_briefs: staff write" on public.project_briefs
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.bbs_schedules add column firm_id uuid references public.firms (id);
update public.bbs_schedules set firm_id = (select id from public.firms limit 1);
alter table public.bbs_schedules
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index bbs_schedules_firm_id_idx on public.bbs_schedules (firm_id);
alter policy "bbs_schedules: staff read" on public.bbs_schedules
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "bbs_schedules: write capability" on public.bbs_schedules
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.bbs_members add column firm_id uuid references public.firms (id);
update public.bbs_members set firm_id = (select id from public.firms limit 1);
alter table public.bbs_members
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index bbs_members_firm_id_idx on public.bbs_members (firm_id);
alter policy "bbs_members: staff read" on public.bbs_members
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "bbs_members: write capability" on public.bbs_members
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.bbs_items add column firm_id uuid references public.firms (id);
update public.bbs_items set firm_id = (select id from public.firms limit 1);
alter table public.bbs_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index bbs_items_firm_id_idx on public.bbs_items (firm_id);
alter policy "bbs_items: staff read" on public.bbs_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "bbs_items: write capability" on public.bbs_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

