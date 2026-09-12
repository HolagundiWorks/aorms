/**
 * ESTI Pulse — Module 7, RAG ingestion (2026-09-13). Plain module, no
 * "use server" — service-role client created internally (ingestion
 * always runs as a background enrichment step from inside another
 * Server Action, never invoked directly from a form).
 *
 * Fully deterministic — no Ollama, no embedding model, nothing to run
 * or keep reachable in production. Content is chunked and stored as
 * plain text; `esti_embeddings.search_vector` (a generated `tsvector`
 * column, migration 0039) is what retrieval searches against via
 * Postgres full-text search. This replaced an earlier pgvector
 * cosine-similarity design (migrations 0036/0037) — dropped by explicit
 * direction so RAG never depends on a self-hosted model being up.
 */
import { createServiceRoleClient } from "../supabase/service";

const MAX_CHUNK_CHARS = 800;

/** Paragraph-based chunking — simple and matches this content's own
 * shape (MoM minutes, progress narratives, decision rationale are all
 * short-to-medium free text, not long documents needing sliding windows). */
export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  // A single-paragraph (no blank-line breaks) input still needs to land
  // as one chunk rather than being silently dropped.
  return chunks.length ? chunks : text.trim() ? [text.trim()] : [];
}

export type IngestResult = { ok: boolean; chunksIndexed: number; error?: string };

/**
 * Re-indexes one source record's free text: always clears any existing
 * chunks for (sourceTable, sourceId) first, so re-ingesting a record
 * (were an edit path ever added) never leaves stale chunks retrievable
 * alongside fresh ones — then stores the current content, chunked.
 * `search_vector` is a generated column, populated by Postgres itself
 * on insert; nothing here computes it.
 */
export async function ingestRecord(input: {
  sourceTable: "moms" | "progress_reports" | "decisions";
  sourceId: string;
  projectId: string | null;
  content: string;
}): Promise<IngestResult> {
  const service = createServiceRoleClient();

  await service.from("esti_embeddings").delete().eq("source_table", input.sourceTable).eq("source_id", input.sourceId);

  const content = input.content.trim();
  if (!content) return { ok: true, chunksIndexed: 0 };

  const chunks = chunkText(content);
  if (chunks.length === 0) return { ok: true, chunksIndexed: 0 };

  const rows = chunks.map((chunk) => ({
    source_table: input.sourceTable,
    source_id: input.sourceId,
    project_id: input.projectId,
    content: chunk,
  }));

  const { error } = await service.from("esti_embeddings").insert(rows);
  if (error) return { ok: false, chunksIndexed: 0, error: error.message };
  return { ok: true, chunksIndexed: rows.length };
}
