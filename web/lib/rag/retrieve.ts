/**
 * ESTI Pulse — Module 7, RAG retrieval (2026-09-13). Takes a caller-
 * supplied Supabase client (the signed-in user's, not service-role) so
 * `esti_embeddings`'s own "staff read" RLS policy is what actually gates
 * this, same as every other read in the app — retrieval never needs to
 * bypass RLS the way ingestion does.
 *
 * Fully deterministic Postgres full-text search (`search_esti_embeddings`
 * RPC, migration 0039) — no embedding model call, no Ollama dependency.
 * Replaced an earlier pgvector cosine-similarity design (migrations
 * 0036/0037), dropped by explicit direction so RAG never depends on a
 * self-hosted model being reachable in production.
 *
 * Output feeds explanations only, never a score or a fact asserted on
 * its own — `askPulse` (lib/actions/ask-pulse.ts) always cites the
 * source record (table/id) a chunk came from, so an answer can be
 * traced back to a real MoM/progress report/decision, never presented
 * as free-floating knowledge.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RetrievedChunk = {
  sourceTable: string;
  sourceId: string;
  content: string;
  rank: number;
};

export type RetrieveResult = { chunks: RetrievedChunk[]; error?: string };

export async function retrieveRelevantContext(
  supabase: SupabaseClient,
  query: string,
  projectId: string,
  limit = 5,
): Promise<RetrieveResult> {
  const { data, error } = await supabase.rpc("search_esti_embeddings", {
    search_query: query,
    match_project_id: projectId,
    match_count: limit,
  });
  if (error) return { chunks: [], error: error.message };

  const rows = (data ?? []) as { source_table: string; source_id: string; content: string; rank: number }[];
  return {
    chunks: rows.map((row) => ({
      sourceTable: row.source_table,
      sourceId: row.source_id,
      content: row.content,
      rank: row.rank,
    })),
  };
}
