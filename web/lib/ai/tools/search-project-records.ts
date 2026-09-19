import { retrieveRelevantContext } from "../../rag/retrieve";
import type { AITool } from "./types";

/** Wraps the existing, already-verified askPulse RAG_QUERY path (lib/rag/retrieve.ts) — no new retrieval logic. */
export const searchProjectRecordsTool: AITool = {
  name: "search_project_records",
  description:
    "Search a project's meeting minutes, progress reports, and decisions for text relevant to a question. Requires a project to already be in context — ask the user which project if none is known.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for" },
    },
    required: ["query"],
  },
  async execute(args, context) {
    if (!context.projectId) {
      return "No project is in context — ask the user which project this question is about.";
    }
    const query = String(args.query ?? "").trim();
    if (!query) return "No search query given.";

    const { chunks, error } = await retrieveRelevantContext(context.supabase, query, context.projectId, 5);
    if (error) return `Search failed: ${error}`;
    if (chunks.length === 0) return "Nothing in this project's records matches that.";

    return chunks.map((c, i) => `(${i + 1}) [${c.sourceTable}] ${c.content.slice(0, 400)}`).join("\n\n");
  },
};
