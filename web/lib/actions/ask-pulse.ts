"use server";

/**
 * ESTI Pulse — Ask Pulse (2026-09-12). Runs the constrained NL
 * interpreter (lib/pulse/interpreter.ts) to classify the question into
 * one of a fixed set of intents, executes the matching deterministic
 * query or RAG retrieval — never the LLM's own free text as the
 * answer's factual content — then phrases the result the same
 * deterministic-template-first, optional-bounded-Ollama-rephrase way
 * lib/ai/phraser.ts already established for the Daily Brief. Lives on
 * its own /pulse page, not the header (the header's Daily Brief popover
 * stays exactly as shipped).
 */
import { createClient } from "../supabase/server";
import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "../ai/ollama";
import { redactPii } from "../ai/redact";
import { PHRASER_REPHRASE_SYSTEM } from "../ai/phraser";
import { INTERPRETER_SYSTEM, parsePulseIntent, type PulseIntent } from "../pulse/interpreter";
import { bandForScore, PRIORITY_BAND_LABEL } from "../pulse/scoring";
import { retrieveRelevantContext } from "../rag/retrieve";

export type AskPulseState = { output: string; error?: string } | null;

type Row = Record<string, unknown>;

function projectOf(row: Row): { title: string } | null {
  const p = row.project_offices;
  return Array.isArray(p) ? (p[0] ?? null) : ((p as { title: string } | null) ?? null);
}
function assigneeOf(row: Row): { full_name: string | null } | null {
  const p = row.profiles;
  return Array.isArray(p) ? (p[0] ?? null) : ((p as { full_name: string | null } | null) ?? null);
}

async function buildDeterministicAnswer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: PulseIntent,
  projectId: string | null,
): Promise<{ text: string; sources: Record<string, unknown>[] }> {
  if (intent.intent === "LIST_PRIORITIES") {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, priority_score, project_offices(title)")
      .neq("status", "DONE")
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(50);
    const rows = (data ?? []) as Row[];
    const filtered = intent.band
      ? rows.filter((r) => bandForScore((r.priority_score as number) ?? 0) === intent.band)
      : rows;
    const top = filtered.slice(0, 5);
    if (top.length === 0) {
      return { text: `No open tasks${intent.band ? ` in the ${PRIORITY_BAND_LABEL[intent.band]} band` : ""} right now.`, sources: [] };
    }
    const lines = top.map((r, i) => {
      const proj = projectOf(r);
      const band = bandForScore((r.priority_score as number) ?? 0);
      return `${i + 1}. ${r.title as string}${proj ? ` (${proj.title})` : ""} — ${PRIORITY_BAND_LABEL[band]}`;
    });
    return {
      text: `Top ${top.length} task${top.length === 1 ? "" : "s"} by priority${intent.band ? ` in ${PRIORITY_BAND_LABEL[intent.band]}` : ""}: ${lines.join(" ")}`,
      sources: top.map((r) => ({ type: "task", id: r.id })),
    };
  }

  if (intent.intent === "LIST_TASKS") {
    let query = supabase
      .from("tasks")
      .select("id, title, status, due_date, project_offices(title), profiles!tasks_assignee_id_fkey(full_name)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(15);
    if (intent.status) query = query.eq("status", intent.status);
    const { data } = await query;
    let rows = (data ?? []) as Row[];
    if (intent.assigneeName) {
      const needle = intent.assigneeName.toLowerCase();
      rows = rows.filter((r) => (assigneeOf(r)?.full_name ?? "").toLowerCase().includes(needle));
    }
    if (rows.length === 0) return { text: "No tasks match that.", sources: [] };
    const lines = rows.slice(0, 10).map((r) => {
      const proj = projectOf(r);
      const assignee = assigneeOf(r);
      return `${r.title as string}${proj ? ` (${proj.title})` : ""}${assignee?.full_name ? ` — ${assignee.full_name}` : ""} [${r.status as string}]`;
    });
    return { text: `${rows.length} task${rows.length === 1 ? "" : "s"} found: ${lines.join("; ")}.`, sources: rows.map((r) => ({ type: "task", id: r.id })) };
  }

  if (intent.intent === "LIST_MISSING_PARAMS") {
    const { data } = await supabase
      .from("task_missing_params")
      .select("id, parameter_type, description, tasks(title)")
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(15);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return { text: "No open gaps — every task has its due date, assignee, and dependencies in order.", sources: [] };
    const lines = rows.map((r) => {
      const task = Array.isArray(r.tasks) ? r.tasks[0] : (r.tasks as { title: string } | null);
      return `${task?.title ?? "Untitled task"}: ${r.description as string}`;
    });
    return { text: `${rows.length} open gap${rows.length === 1 ? "" : "s"}: ${lines.join("; ")}.`, sources: rows.map((r) => ({ type: "missingParam", id: r.id })) };
  }

  if (intent.intent === "RAG_QUERY") {
    if (!projectId) {
      return { text: "Pick a project first — this kind of question needs to be scoped to one project's meeting minutes, progress reports, and decisions.", sources: [] };
    }
    const { chunks, error } = await retrieveRelevantContext(supabase, intent.question, projectId, 5);
    if (error) return { text: `Couldn't search project records right now (${error}).`, sources: [] };
    if (chunks.length === 0) return { text: "Nothing in this project's meeting minutes, progress reports, or decisions matches that question yet.", sources: [] };
    const excerpts = chunks.map((c, i) => `(${i + 1}) ${c.content.slice(0, 300)}`).join(" ");
    return {
      text: `From this project's records: ${excerpts}`,
      sources: chunks.map((c) => ({ type: c.sourceTable, id: c.sourceId })),
    };
  }

  return { text: "I couldn't match that to a question Pulse can answer yet — try asking about priorities, tasks, missing gaps, or a specific project's records.", sources: [] };
}

export async function askPulse(_prev: AskPulseState, formData: FormData): Promise<AskPulseState> {
  const question = String(formData.get("question") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  if (!question) return { output: "", error: "Ask a question first." };
  if (question.length > 500) return { output: "", error: "Keep the question under 500 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { output: "", error: "Sign in to ask Pulse." };

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  const health = await checkOllamaHealth({ baseUrl, model });

  let intent: PulseIntent = { intent: "UNKNOWN" };
  if (health.ok) {
    try {
      const { text } = await callOllamaChat({ baseUrl, model, system: INTERPRETER_SYSTEM, user: question });
      intent = parsePulseIntent(text);
    } catch {
      intent = { intent: "UNKNOWN" };
    }
  }

  const { text: deterministicText, sources } = await buildDeterministicAnswer(supabase, intent, projectId);

  let output = deterministicText;
  let provider = "template";
  let usedModel = "deterministic";
  let tokenEstimate: number | null = null;

  if (health.ok && intent.intent !== "UNKNOWN") {
    try {
      const { text, tokens } = await callOllamaChat({ baseUrl, model, system: PHRASER_REPHRASE_SYSTEM, user: deterministicText });
      output = redactPii(text);
      provider = "ollama";
      usedModel = model;
      tokenEstimate = tokens;
    } catch {
      // Deterministic text already assigned — keep it.
    }
  }

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    project_id: projectId,
    kind: "PULSE_QUERY",
    provider,
    model: usedModel,
    prompt_summary: question.slice(0, 200),
    sources,
    output_text: output,
    used_external_api: "false",
    token_estimate: tokenEstimate === null ? null : String(tokenEstimate),
  });

  return { output };
}
