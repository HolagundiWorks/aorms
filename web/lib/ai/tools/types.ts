import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Esti tool layer (2026-09-20, phase 6 of docs/esti/
 * LIGHTWEIGHT-ARCHITECTURE-PLAN.md) — "Esti uses AORMS, rather than
 * becoming the entire AORMS backend": each tool wraps an existing,
 * already-tested read path (lib/rag/retrieve.ts, lib/ai/snapshot.ts),
 * never a new query written just for this. Read-only by design so far —
 * no tool in tools/*.ts writes anything.
 */
export type AIToolContext = {
  supabase: SupabaseClient;
  projectId?: string | null;
};

export interface AITool {
  name: string;
  description: string;
  /** JSON Schema, passed to Ollama's tools[].function.parameters as-is. */
  parameters: Record<string, unknown>;
  /** Returns plain text fed back to the model as a `tool` role message — not structured data the model has to parse. */
  execute(args: Record<string, unknown>, context: AIToolContext): Promise<string>;
}
