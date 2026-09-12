/**
 * ESTI Pulse — Natural Language Interpreter (2026-09-12). A constrained
 * intent parser, not open generation: the model is instructed to emit
 * *only* JSON matching one of a fixed set of intents, and that JSON is
 * validated against a zod schema before anything runs. An unparseable
 * or schema-invalid response is always treated as UNKNOWN — the LLM
 * never gets to execute an intent it merely claims exists, and it never
 * supplies the factual content of an answer, only which deterministic
 * query or RAG lookup to run (docs/esti/ESTI-PULSE.md's own core
 * principle, carried into this layer).
 */
import { z } from "zod";

export const PulseIntentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("LIST_PRIORITIES"),
    band: z.enum(["CRITICAL", "ACTION_TODAY", "WATCH", "NORMAL", "BACKLOG"]).nullable().optional(),
  }),
  z.object({
    intent: z.literal("LIST_TASKS"),
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).nullable().optional(),
    assigneeName: z.string().nullable().optional(),
  }),
  z.object({
    intent: z.literal("LIST_MISSING_PARAMS"),
  }),
  z.object({
    intent: z.literal("RAG_QUERY"),
    projectTitle: z.string().nullable().optional(),
    question: z.string().min(1),
  }),
  z.object({
    intent: z.literal("UNKNOWN"),
  }),
]);

export type PulseIntent = z.infer<typeof PulseIntentSchema>;

export const INTERPRETER_SYSTEM = `You are an intent classifier for an office-management tool called ESTI Pulse. \
Given a user's question, output ONLY a single JSON object (no prose, no markdown fences) matching exactly one of these shapes:

{"intent": "LIST_PRIORITIES", "band": "CRITICAL" | "ACTION_TODAY" | "WATCH" | "NORMAL" | "BACKLOG" | null}
{"intent": "LIST_TASKS", "status": "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | null, "assigneeName": string | null}
{"intent": "LIST_MISSING_PARAMS"}
{"intent": "RAG_QUERY", "projectTitle": string | null, "question": string}
{"intent": "UNKNOWN"}

Rules:
- Never invent facts, scores, or data — you only classify which lookup to run.
- If the question asks "what's urgent / top priority / what should I focus on", use LIST_PRIORITIES.
- If it asks about a specific status or person's tasks, use LIST_TASKS.
- If it asks what's blocking things or what's missing/incomplete on tasks, use LIST_MISSING_PARAMS.
- If it asks a free-text question about what was discussed, decided, or reported on a project (e.g. "what did we decide about the facade", "what did the last site meeting cover"), use RAG_QUERY with the original question and, if named, the project title.
- If the question doesn't fit any of these, or isn't actually a question, use UNKNOWN.
- Output valid JSON only. No explanation.`;

/** Parses a raw model response into a validated PulseIntent, falling back
 * to UNKNOWN for anything that doesn't parse or doesn't validate — never
 * throws, never lets a malformed response reach the caller as if it were
 * a real intent. */
export function parsePulseIntent(raw: string): PulseIntent {
  const trimmed = raw.trim();
  // Models sometimes wrap JSON in ```json fences despite instructions —
  // strip those before parsing rather than failing on a technicality.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  let candidate: unknown;
  try {
    candidate = JSON.parse(unfenced);
  } catch {
    return { intent: "UNKNOWN" };
  }

  const result = PulseIntentSchema.safeParse(candidate);
  return result.success ? result.data : { intent: "UNKNOWN" };
}
