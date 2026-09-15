-- Multi-tenancy, Batch 12/12 — everything else.
-- numbering_patterns (special case, like sequences), decisions,
-- task_dependencies, task_missing_params, task_priority_log,
-- esti_embeddings, kpi_snapshots. (ai_devices does not exist in this
-- schema — skipped, not a table in this project.)
--
-- With this batch, every tenant table in the schema carries firm_id and
-- firm-scoped RLS. What's NOT covered here (by design, tracked
-- separately): the service-role/cron paths that write to esti_embeddings/
-- kpi_snapshots/tasks etc. without a session (RAG ingest, Pulse recompute/
-- snapshot-kpis, reset_demo_data()'s full rewrite) — those need explicit
-- firm_id handling in application code, not RLS, since there's no session
-- for a default/policy to key off of.

-- ── numbering_patterns (special case, mirrors sequences/0054) ──────────
alter table public.numbering_patterns add column firm_id uuid references public.firms (id);
update public.numbering_patterns set firm_id = (select id from public.firms limit 1);
alter table public.numbering_patterns
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint numbering_patterns_scope_key,
  add constraint numbering_patterns_firm_scope_key unique (firm_id, scope);
create index numbering_patterns_firm_id_idx on public.numbering_patterns (firm_id);
alter policy "numbering_patterns: staff read" on public.numbering_patterns
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "numbering_patterns: owner write" on public.numbering_patterns
  using (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id())
  with check (public.current_app_role() = 'OWNER' and firm_id = public.current_firm_id());

-- ── decisions ────────────────────────────────────────────────────────────
alter table public.decisions add column firm_id uuid references public.firms (id);
update public.decisions set firm_id = (select id from public.firms limit 1);
alter table public.decisions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index decisions_firm_id_idx on public.decisions (firm_id);
alter policy "decisions: staff read" on public.decisions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "decisions: staff write" on public.decisions
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "decisions: own portal read" on public.decisions
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and state = any (array['CLIENT_REVIEW', 'ACCEPTED', 'REJECTED', 'LOCKED'])
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

-- ── task_dependencies ────────────────────────────────────────────────────
alter table public.task_dependencies add column firm_id uuid references public.firms (id);
update public.task_dependencies set firm_id = (select id from public.firms limit 1);
alter table public.task_dependencies
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index task_dependencies_firm_id_idx on public.task_dependencies (firm_id);
alter policy "task_dependencies: staff read" on public.task_dependencies
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "task_dependencies: staff write" on public.task_dependencies
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── task_missing_params ──────────────────────────────────────────────────
alter table public.task_missing_params add column firm_id uuid references public.firms (id);
update public.task_missing_params set firm_id = (select id from public.firms limit 1);
alter table public.task_missing_params
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index task_missing_params_firm_id_idx on public.task_missing_params (firm_id);
alter policy "task_missing_params: staff read" on public.task_missing_params
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "task_missing_params: staff write" on public.task_missing_params
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── task_priority_log — read-only via RLS, written by a service-role job ──
alter table public.task_priority_log add column firm_id uuid references public.firms (id);
update public.task_priority_log set firm_id = (select id from public.firms limit 1);
alter table public.task_priority_log
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index task_priority_log_firm_id_idx on public.task_priority_log (firm_id);
alter policy "task_priority_log: staff read" on public.task_priority_log
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── esti_embeddings — read-only via RLS, written by service-role RAG ingest ──
alter table public.esti_embeddings add column firm_id uuid references public.firms (id);
update public.esti_embeddings set firm_id = (select id from public.firms limit 1);
alter table public.esti_embeddings
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index esti_embeddings_firm_id_idx on public.esti_embeddings (firm_id);
alter policy "esti_embeddings: staff read" on public.esti_embeddings
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── kpi_snapshots — read-only via RLS, written by a service-role cron job ──
-- Unique key folds in firm_id so two firms' KPI snapshots for the same
-- captured_on never collide/overwrite each other.
alter table public.kpi_snapshots add column firm_id uuid references public.firms (id);
update public.kpi_snapshots set firm_id = (select id from public.firms limit 1);
alter table public.kpi_snapshots
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint kpi_snapshots_metric_key_captured_on_key,
  add constraint kpi_snapshots_firm_metric_captured_key unique (firm_id, metric_key, captured_on);
create index kpi_snapshots_firm_id_idx on public.kpi_snapshots (firm_id);
alter policy "kpi_snapshots: staff read" on public.kpi_snapshots
  using (public.is_office_staff() and firm_id = public.current_firm_id());
