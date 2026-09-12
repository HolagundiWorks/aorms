/**
 * ESTI Pulse — Natural Language Interpreter (2026-09-13). Fully
 * deterministic keyword/pattern matcher — no model call, no Ollama
 * dependency. An earlier version sent the question to Ollama with a
 * constrained system prompt asking it to emit one of five fixed intents
 * as JSON; dropped by explicit direction so the interpreter never
 * depends on a self-hosted model being reachable in production. The
 * zod-validated output shape is unchanged, so callers (`ask-pulse.ts`)
 * didn't need to change: the interpreter's contract was always "one of
 * five fixed intents, validated before anything runs" — only how that
 * intent gets classified changed.
 *
 * This is an honest trade: a keyword matcher understands far less than
 * a model would (no paraphrase tolerance, no multi-clause questions),
 * so genuinely ambiguous or unusually-phrased questions fall through to
 * UNKNOWN more often than an LLM-backed version would. That's the
 * disclosed cost of dropping the model dependency, not a bug.
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
    question: z.string().min(1),
  }),
  z.object({
    intent: z.literal("UNKNOWN"),
  }),
]);

export type PulseIntent = z.infer<typeof PulseIntentSchema>;

// Checked in this order — missing-parameter language ("blocked",
// "missing") is more specific than a bare priority word, so it's tested
// first to avoid a gap-related question being misread as a priority one.
const MISSING_PARAM_PATTERN = /\b(missing|gap|incomplete|not\s+assigned|no\s+assignee|no\s+due\s*date|unassigned)\b/i;
const TASK_STATUS_PATTERNS: [PulseIntentTaskStatus, RegExp][] = [
  ["TODO", /\bto[\s-]?do\b/i],
  ["IN_PROGRESS", /\bin[\s-]?progress\b/i],
  ["BLOCKED", /\bblocked\b/i],
  ["DONE", /\bdone|complete(d)?\b/i],
];
type PulseIntentTaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
const TASK_LIST_PATTERN = /\btask(s)?\b/i;
const ASSIGNEE_PATTERN = /\b(?:assigned to|for)\s+([a-z][a-z' -]{1,40}?)(?:'s)?\s*(?:tasks?)?\??$|\b([a-z][a-z' -]{1,40}?)'s\s+tasks?\b/i;
const PRIORITY_PATTERN = /\b(priorit(y|ies)|urgent|critical|focus|most important|top\s)\b/i;
const PRIORITY_BAND_PATTERNS: [PulseIntentBand, RegExp][] = [
  ["CRITICAL", /\bcritical\b/i],
  ["ACTION_TODAY", /\baction\s*today\b/i],
  ["WATCH", /\bwatch\b/i],
  ["NORMAL", /\bnormal\b/i],
  ["BACKLOG", /\bbacklog\b/i],
];
type PulseIntentBand = "CRITICAL" | "ACTION_TODAY" | "WATCH" | "NORMAL" | "BACKLOG";
const RAG_PATTERN = /\b(decide|decided|decision|discuss(ed)?|meeting|minutes|mom|report(ed)?|rationale|agreed|said)\b/i;

/** Deterministic intent classification — a fixed set of pattern checks,
 * never a model call. Returns UNKNOWN for anything that doesn't match a
 * known shape, same fallback behavior the earlier model-backed version
 * had for unparseable output. */
export function classifyPulseIntent(question: string): PulseIntent {
  const trimmed = question.trim();
  if (!trimmed) return { intent: "UNKNOWN" };

  if (MISSING_PARAM_PATTERN.test(trimmed)) {
    return { intent: "LIST_MISSING_PARAMS" };
  }

  if (TASK_LIST_PATTERN.test(trimmed)) {
    let status: PulseIntentTaskStatus | null = null;
    for (const [candidate, pattern] of TASK_STATUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        status = candidate;
        break;
      }
    }
    const assigneeMatch = trimmed.match(ASSIGNEE_PATTERN);
    const assigneeName = assigneeMatch ? (assigneeMatch[1] ?? assigneeMatch[2] ?? null)?.trim() ?? null : null;
    if (status || assigneeName) {
      return { intent: "LIST_TASKS", status, assigneeName };
    }
  }

  if (PRIORITY_PATTERN.test(trimmed)) {
    let band: PulseIntentBand | null = null;
    for (const [candidate, pattern] of PRIORITY_BAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        band = candidate;
        break;
      }
    }
    return { intent: "LIST_PRIORITIES", band };
  }

  if (RAG_PATTERN.test(trimmed)) {
    return { intent: "RAG_QUERY", question: trimmed };
  }

  return { intent: "UNKNOWN" };
}
