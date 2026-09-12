/**
 * ESTI Pulse — Module 7, RAG ingestion (2026-09-12). Plain module, no
 * "use server" — service-role client created internally (ingestion
 * always runs as a background enrichment step from inside another
 * Server Action, never invoked directly from a form).
 *
 * Best-effort by design: a save action (MoM/Progress Report/Decision)
 * must never fail because Ollama's embedding model happens to be
 * unreachable — this returns `{ ok: false, error }` for the caller to
 * log/ignore rather than throwing, so `createMomRecord` etc. stay
 * exactly as reliable as they were before RAG existed.
 */
import { createServiceRoleClient } from "../supabase/service";
import { callOllamaEmbed, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaEmbedModelFromEnv } from "../ai/ollama";

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
 * alongside fresh ones — then embeds and inserts the current content.
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

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaEmbedModelFromEnv();
  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) {
    return { ok: false, chunksIndexed: 0, error: health.error ?? "Ollama embeddings unavailable" };
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) return { ok: true, chunksIndexed: 0 };

  const rows: { source_table: string; source_id: string; project_id: string | null; content: string; embedding: number[] }[] = [];
  for (const chunk of chunks) {
    try {
      const embedding = await callOllamaEmbed({ baseUrl, model, text: chunk });
      rows.push({ source_table: input.sourceTable, source_id: input.sourceId, project_id: input.projectId, content: chunk, embedding });
    } catch (err) {
      return { ok: false, chunksIndexed: 0, error: err instanceof Error ? err.message : "Embedding call failed" };
    }
  }

  const { error } = await service.from("esti_embeddings").insert(rows);
  if (error) return { ok: false, chunksIndexed: 0, error: error.message };
  return { ok: true, chunksIndexed: rows.length };
}
