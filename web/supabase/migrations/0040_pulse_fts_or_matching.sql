-- ESTI Pulse — fix full-text search to OR terms, not AND (2026-09-13).
-- `plainto_tsquery` ANDs every lexeme together, so a natural question
-- like "what did we decide about the facade material" (→ decid & facad
-- & materi) returns nothing the moment even one word (here "decide" vs
-- the source text's actual "agreed") isn't verbatim in the matched
-- document — found live-verifying migration 0039 with a real inserted
-- test row before considering it done, not assumed to work from the
-- function compiling cleanly. Retrieval wants "how many of these terms
-- overlap" (OR, ranked by match count via ts_rank), not "every term
-- must be present" (AND) — this is the correct fix for a keyword-only
-- retrieval mechanism doing the job semantic vector similarity used to.

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
    ts_rank(e.search_vector, query) as rank
  from public.esti_embeddings e,
    to_tsquery('english', replace(plainto_tsquery('english', search_query)::text, ' & ', ' | ')) as query
  where e.project_id = match_project_id
    and e.search_vector @@ query
  order by rank desc
  limit greatest(match_count, 1)
$$;

grant execute on function public.search_esti_embeddings(text, uuid, int) to authenticated;
