/**
 * ESTI Pulse — Module 7, RAG retrieval (2026-09-12). Takes a caller-
 * supplied Supabase client (the signed-in user's, not service-role) so
 * `esti_embeddings`'s own "staff read" RLS policy is what actually gates
 * this, same as every other read in the app — retrieval never needs to
 * bypass RLS the way ingestion does.
 *
 * Output feeds explanations only, never a score or a fact asserted on
 * its own — `askPulse` (lib/actions/ask-pulse.ts) always cites the
 * source record (table/id) a chunk came from, so an answer can be
 * traced back to a real MoM/progress report/decision, never presented
 * as free-floating LLM knowledge.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callOllamaEmbed, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaEmbedModelFromEnv } from "../ai/ollama";

export type RetrievedChunk = {
  sourceTable: string;
  sourceId: string;
  content: string;
  similarity: number;
};

export type RetrieveResult = { chunks: RetrievedChunk[]; error?: string };

export async function retrieveRelevantContext(
  supabase: SupabaseClient,
  query: string,
  projectId: string,
  limit = 5,
): Promise<RetrieveResult> {
  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaEmbedModelFromEnv();

  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) return { chunks: [], error: health.error ?? "Ollama embeddings unavailable" };

  let embedding: number[];
  try {
    embedding = await callOllamaEmbed({ baseUrl, model, text: query });
  } catch (err) {
    return { chunks: [], error: err instanceof Error ? err.message : "Embedding call failed" };
  }

  const { data, error } = await supabase.rpc("match_esti_embeddings", {
    query_embedding: embedding,
    match_project_id: projectId,
    match_count: limit,
  });
  if (error) return { chunks: [], error: error.message };

  const rows = (data ?? []) as { source_table: string; source_id: string; content: string; similarity: number }[];
  return {
    chunks: rows.map((row) => ({
      sourceTable: row.source_table,
      sourceId: row.source_id,
      content: row.content,
      similarity: row.similarity,
    })),
  };
}
