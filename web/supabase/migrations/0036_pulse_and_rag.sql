-- ESTI Pulse — workflow management, task prediction, RAG (2026-09-12).
-- Ports docs/esti/ESTI-PULSE.md's design onto the current web/ Next.js/
-- Supabase stack — that design was built and shipped against the old
-- Fastify/Drizzle backend, which is dead (see CLAUDE.md § Dev/verify
-- loop). `tasks.priority_score`/`confidence_score`/`difficulty_
-- coefficient`/`intervention_required` already exist (declared since
-- Phase 2, migration 0001) — this migration doesn't touch those columns,
-- it adds the tables needed to actually compute and explain them.

create extension if not exists vector;
create extension if not exists pg_net;

-- ── Module 1 — Task Dependency Graph ─────────────────────────────────────
-- Supplements the existing single `tasks.depends_on_id` (kept for
-- backward compatibility — reads prefer this graph, per ESTI-PULSE.md
-- § 14's own migration note).
create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  dependency_type text not null check (dependency_type in ('BLOCKS', 'INFORMS', 'APPROVAL', 'DOCUMENT')),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  created_at timestamptz not null default now(),
  check (task_id <> depends_on_task_id)
);

alter table public.task_dependencies enable row level security;
create policy "task_dependencies: staff read" on public.task_dependencies
  for select using (public.is_office_staff());
create policy "task_dependencies: staff write" on public.task_dependencies
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- ── Module 2 — Missing Parameter Detector ────────────────────────────────
create table public.task_missing_params (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  parameter_type text not null,
  description text not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CONFIRMED', 'BLOCKED', 'NOT_REQUIRED')),
  resolved_at timestamptz,
  resolved_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.task_missing_params enable row level security;
create policy "task_missing_params: staff read" on public.task_missing_params
  for select using (public.is_office_staff());
create policy "task_missing_params: staff write" on public.task_missing_params
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- ── Modules 5/6 — Priority/Confidence audit trail ────────────────────────
-- Every recompute writes one row here — scores must be explainable and
-- auditable, not a black box (ESTI-PULSE.md § 8-9).
create table public.task_priority_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  old_priority_score integer,
  new_priority_score integer not null,
  old_confidence_score integer,
  new_confidence_score integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.task_priority_log enable row level security;
create policy "task_priority_log: staff read" on public.task_priority_log
  for select using (public.is_office_staff());
-- No write policy — only the service-role recompute route inserts here.

-- ── Module 7 — RAG embeddings ─────────────────────────────────────────────
-- Scoped to MoMs/Progress Reports/Decisions for this first pass (the
-- three richest free-text sources) — not every document type in the
-- schema. `embedding vector(768)` matches nomic-embed-text's own output
-- dimension (confirmed live against a local Ollama instance before
-- writing this migration, not assumed from documentation alone).
create table public.esti_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  project_id uuid references public.project_offices (id) on delete cascade,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.esti_embeddings enable row level security;
create policy "esti_embeddings: staff read" on public.esti_embeddings
  for select using (public.is_office_staff());
-- No write policy — ingestion goes through the service-role client only,
-- same "no policy, service-role only" precedent used throughout this
-- session for system-populated tables.

create index esti_embeddings_vector_idx on public.esti_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index esti_embeddings_project_idx on public.esti_embeddings (project_id);
