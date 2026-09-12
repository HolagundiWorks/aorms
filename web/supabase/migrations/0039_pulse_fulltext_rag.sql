-- ESTI Pulse — retire vector-embedding RAG in favor of full-text search
-- (2026-09-13). Explicit direction: drop the Ollama dependency for RAG
-- and the NL interpreter, keeping both fully deterministic — no self-
-- hosted model to run, host, or keep reachable in production. Postgres
-- full-text search (tsvector/plainto_tsquery) replaces pgvector cosine
-- similarity as the retrieval mechanism; content is still chunked and
-- traceable back to its source record exactly as before.
--
-- Safe to run: production's esti_embeddings has zero real rows (Ollama
-- was never reachable in production, so ingestRecord's embed step has
-- been failing best-effort silently since it shipped — confirmed before
-- writing this migration, not assumed).

drop function if exists public.match_esti_embeddings(vector, uuid, int);
drop index if exists public.esti_embeddings_vector_idx;
alter table public.esti_embeddings drop column if exists embedding;

alter table public.esti_embeddings
  add column search_vector tsvector generated always as (to_tsvector('english', content)) stored;

create index esti_embeddings_search_idx on public.esti_embeddings using gin (search_vector);

create or replace function public.search_esti_embeddings(
  search_query text,
  match_project_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  source_table text,
  source_id uuid,
  project_id uuid,
  content text,
  rank real
)
language sql
stable
as $$
  select
    e.id,
    e.source_table,
    e.source_id,
    e.project_id,
    e.content,
    ts_rank(e.search_vector, plainto_tsquery('english', search_query)) as rank
  from public.esti_embeddings e
  where e.project_id = match_project_id
    and e.search_vector @@ plainto_tsquery('english', search_query)
  order by rank desc
  limit greatest(match_count, 1)
$$;

grant execute on function public.search_esti_embeddings(text, uuid, int) to authenticated;

-- `vector` extension is left installed (harmless, no longer used by any
-- table) rather than dropped — dropping extensions this app didn't
-- create the dependency graph for is riskier than leaving one idle.
