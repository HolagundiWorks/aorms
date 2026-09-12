-- ESTI Pulse — Module 7, cosine-similarity search RPC (2026-09-12).
-- PostgREST can't express the pgvector `<=>` operator through a normal
-- `.select()`/`.order()` call, so retrieval needs a callable function.
-- Deliberately NOT `security definer` — it should run as the caller and
-- be gated by esti_embeddings' own "staff read" RLS policy (migration
-- 0036), the same as every other read in this app; a service-role
-- caller (there is none for retrieval — only ingestion uses service-role)
-- would bypass RLS anyway regardless of this function's security mode.

create or replace function public.match_esti_embeddings(
  query_embedding vector(768),
  match_project_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  source_table text,
  source_id uuid,
  project_id uuid,
  content text,
  similarity float
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
    1 - (e.embedding <=> query_embedding) as similarity
  from public.esti_embeddings e
  where e.project_id = match_project_id
  order by e.embedding <=> query_embedding
  limit greatest(match_count, 1)
$$;

grant execute on function public.match_esti_embeddings(vector, uuid, int) to authenticated;
