-- Multi-tenancy, Batch 5/12 -- AI / Knowledge Bank.
-- ai_runs, cpi_responses, repo_sources, repo_sections, master_plans,
-- standards, standard_files. Uniform Pattern A. Confirmed this session:
-- these use the same staff-only RLS shape as every other table, with no
-- design-doc indication they were meant as shared/cross-firm reference
-- content -- treated as firm-private like everything else, no carve-out.

alter table public.ai_runs add column firm_id uuid references public.firms (id);
update public.ai_runs set firm_id = (select id from public.firms limit 1);
alter table public.ai_runs
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index ai_runs_firm_id_idx on public.ai_runs (firm_id);
alter policy "ai_runs: staff read" on public.ai_runs
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "ai_runs: staff write" on public.ai_runs
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.cpi_responses add column firm_id uuid references public.firms (id);
update public.cpi_responses set firm_id = (select id from public.firms limit 1);
alter table public.cpi_responses
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index cpi_responses_firm_id_idx on public.cpi_responses (firm_id);
alter policy "cpi_responses: staff read" on public.cpi_responses
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "cpi_responses: staff write" on public.cpi_responses
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.repo_sources add column firm_id uuid references public.firms (id);
update public.repo_sources set firm_id = (select id from public.firms limit 1);
alter table public.repo_sources
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index repo_sources_firm_id_idx on public.repo_sources (firm_id);
alter policy "repo_sources: staff read" on public.repo_sources
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "repo_sources: write capability" on public.repo_sources
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.repo_sections add column firm_id uuid references public.firms (id);
update public.repo_sections set firm_id = (select id from public.firms limit 1);
alter table public.repo_sections
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index repo_sections_firm_id_idx on public.repo_sections (firm_id);
alter policy "repo_sections: staff read" on public.repo_sections
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "repo_sections: write capability" on public.repo_sections
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.master_plans add column firm_id uuid references public.firms (id);
update public.master_plans set firm_id = (select id from public.firms limit 1);
alter table public.master_plans
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index master_plans_firm_id_idx on public.master_plans (firm_id);
alter policy "master_plans: staff read" on public.master_plans
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "master_plans: write capability" on public.master_plans
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.standards add column firm_id uuid references public.firms (id);
update public.standards set firm_id = (select id from public.firms limit 1);
alter table public.standards
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index standards_firm_id_idx on public.standards (firm_id);
alter policy "standards: staff read" on public.standards
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "standards: write capability" on public.standards
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.standard_files add column firm_id uuid references public.firms (id);
update public.standard_files set firm_id = (select id from public.firms limit 1);
alter table public.standard_files
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index standard_files_firm_id_idx on public.standard_files (firm_id);
alter policy "standard_files: staff read" on public.standard_files
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "standard_files: write capability" on public.standard_files
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

