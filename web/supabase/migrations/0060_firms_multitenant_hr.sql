-- Multi-tenancy, Batch 6/12 — HR & payroll.
-- team_members, teams, team_memberships, assignments, leaves, payslips,
-- attendance, reward_points, hr_profiles, hr_documents, job_applications.
-- payslips/hr_documents are the most sensitive data in this schema —
-- verify live with a real cross-firm read attempt, not just policy text.

alter table public.team_members add column firm_id uuid references public.firms (id);
update public.team_members set firm_id = (select id from public.firms limit 1);
alter table public.team_members
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index team_members_firm_id_idx on public.team_members (firm_id);
alter policy "team_members: staff read" on public.team_members
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "team_members: owner write" on public.team_members
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());

alter table public.teams add column firm_id uuid references public.firms (id);
update public.teams set firm_id = (select id from public.firms limit 1);
alter table public.teams
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index teams_firm_id_idx on public.teams (firm_id);
alter policy "teams: staff read" on public.teams
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "teams: owner write" on public.teams
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());

alter table public.team_memberships add column firm_id uuid references public.firms (id);
update public.team_memberships set firm_id = (select id from public.firms limit 1);
alter table public.team_memberships
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index team_memberships_firm_id_idx on public.team_memberships (firm_id);
alter policy "team_memberships: staff read" on public.team_memberships
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "team_memberships: staff write" on public.team_memberships
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.assignments add column firm_id uuid references public.firms (id);
update public.assignments set firm_id = (select id from public.firms limit 1);
alter table public.assignments
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index assignments_firm_id_idx on public.assignments (firm_id);
alter policy "assignments: staff read" on public.assignments
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "assignments: staff write" on public.assignments
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.leaves add column firm_id uuid references public.firms (id);
update public.leaves set firm_id = (select id from public.firms limit 1);
alter table public.leaves
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index leaves_firm_id_idx on public.leaves (firm_id);
alter policy "leaves: staff read" on public.leaves
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "leaves: staff write" on public.leaves
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.payslips add column firm_id uuid references public.firms (id);
update public.payslips set firm_id = (select id from public.firms limit 1);
alter table public.payslips
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index payslips_firm_id_idx on public.payslips (firm_id);
alter policy "payslips: staff read" on public.payslips
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "payslips: hr:manage write" on public.payslips
  using (public.has_capability('hr:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('hr:manage') and firm_id = public.current_firm_id());

alter table public.attendance add column firm_id uuid references public.firms (id);
update public.attendance set firm_id = (select id from public.firms limit 1);
alter table public.attendance
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index attendance_firm_id_idx on public.attendance (firm_id);
alter policy "attendance: staff read" on public.attendance
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "attendance: staff write" on public.attendance
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.reward_points add column firm_id uuid references public.firms (id);
update public.reward_points set firm_id = (select id from public.firms limit 1);
alter table public.reward_points
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index reward_points_firm_id_idx on public.reward_points (firm_id);
alter policy "reward_points: staff read" on public.reward_points
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "reward_points: owner write" on public.reward_points
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());

alter table public.hr_profiles add column firm_id uuid references public.firms (id);
update public.hr_profiles set firm_id = (select id from public.firms limit 1);
alter table public.hr_profiles
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index hr_profiles_firm_id_idx on public.hr_profiles (firm_id);
alter policy "hr_profiles: hr:manage or own" on public.hr_profiles
  using (firm_id = public.current_firm_id()
         and (public.has_capability('hr:manage') or exists (select 1 from public.team_members tm where tm.id = hr_profiles.member_id and tm.user_id = auth.uid())));
alter policy "hr_profiles: hr:manage write" on public.hr_profiles
  using (public.has_capability('hr:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('hr:manage') and firm_id = public.current_firm_id());

alter table public.hr_documents add column firm_id uuid references public.firms (id);
update public.hr_documents set firm_id = (select id from public.firms limit 1);
alter table public.hr_documents
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index hr_documents_firm_id_idx on public.hr_documents (firm_id);
alter policy "hr_documents: hr:manage or own" on public.hr_documents
  using (firm_id = public.current_firm_id()
         and (public.has_capability('hr:manage') or exists (select 1 from public.team_members tm where tm.id = hr_documents.member_id and tm.user_id = auth.uid())));
alter policy "hr_documents: hr:manage write" on public.hr_documents
  using (public.has_capability('hr:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('hr:manage') and firm_id = public.current_firm_id());

alter table public.job_applications add column firm_id uuid references public.firms (id);
update public.job_applications set firm_id = (select id from public.firms limit 1);
alter table public.job_applications
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index job_applications_firm_id_idx on public.job_applications (firm_id);
alter policy "job_applications: hr:manage" on public.job_applications
  using (public.has_capability('hr:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('hr:manage') and firm_id = public.current_firm_id());
