-- Phase 7 — AI: the one piece the audit found genuinely portable regardless
-- of the unresolved AI-gateway architecture question (CLAUDE.md/PRODUCTION-OPS
-- /the actual ai/gateway.ts code disagree on how ESTI reaches an LLM provider
-- in the target deployment — NOT resolved here, flagged as a real product
-- decision in NEXTJS-MIGRATION-PHASE7-AUDIT.md). This table is provenance/
-- audit infrastructure independent of that decision: whichever provider ends
-- up wired, every generation still needs a record of what was produced, from
-- what sources, and whether a human approved it before it was issued.
--
-- RLS: bare `is_office_staff()`, matching modules/ai/router.ts's actual
-- gating today (protectedProcedure, no capability check) — listRuns scopes
-- its own query to a project or the caller's own runs, but that's a query
-- shape, not an authorization restriction; any staff member can pass a
-- different projectId and see it. Don't invent a narrower policy the
-- current backend doesn't enforce either.

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  project_id uuid references public.project_offices (id),
  kind text not null,
  provider text not null,
  model text not null,
  prompt_summary text,
  sources jsonb not null default '[]'::jsonb,
  output_text text not null,
  approval_state text not null default 'DRAFT',
  issued_entity_type text,
  issued_entity_id uuid,
  -- Kept as text ('true'/'false' strings), matching the current schema's own
  -- quirk exactly (backend/src/db/schema/ai.ts) rather than silently
  -- "fixing" it to a real boolean during the port.
  used_external_api text not null default 'false',
  token_estimate text,
  created_at timestamptz not null default now()
);

alter table public.ai_runs enable row level security;
create policy "ai_runs: staff read" on public.ai_runs
  for select using (public.is_office_staff());
create policy "ai_runs: staff write" on public.ai_runs
  for all using (public.is_office_staff()) with check (public.is_office_staff());
