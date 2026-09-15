"use server";

/**
 * ESTI Pulse — Ask Pulse (2026-09-13). Runs the fully deterministic NL
 * interpreter (lib/pulse/interpreter.ts) to classify the question into
 * one of a fixed set of intents, executes the matching deterministic
 * query or RAG retrieval, and returns that text as-is — never a model's
 * own free text as the answer's factual content. Earlier versions sent
 * the question and the deterministic answer through Ollama (classify,
 * then optionally rephrase); both steps were dropped by explicit
 * direction so Ask Pulse never depends on a self-hosted model being
 * reachable in production. Lives on its own /pulse page, not the header
 * (the header's Daily Brief popover — which does still use Ollama,
 * optionally — stays exactly as shipped).
 *
 * ESTI Lite / Full ESTI (2026-09-15) — closes a real landing-page/
 * product gap: the pricing page has claimed this distinction (Studio =
 * "ESTI Lite", Professional = "Full ESTI") since the pricing rebuild,
 * with nothing behind it in code. `getFirmStudio()`'s plan now genuinely
 * gates two capabilities: `LIST_DEPENDENCY_BLOCKS` (real
 * task_dependencies data, previously unreachable from Ask Pulse at all)
 * and project-name-scoped `LIST_PRIORITIES` (the interpreter's
 * `projectNameHint`). Everything else — priorities, tasks, missing
 * gaps, RAG over a project's own records — is unchanged and identical
 * on every plan; this was never about withholding the core feature,
 * only the two genuinely deeper capabilities. No studio linked at all
 * (`getFirmStudio()` returns null) defaults to Full — same permissive-
 * when-unlinked posture `checkPlanCap` already uses, since there's no
 * plan to enforce against.
 */
import { createClient } from "../supabase/server";
import { classifyPulseIntent, type PulseIntent } from "../pulse/interpreter";
import { bandForScore, PRIORITY_BAND_LABEL } from "../pulse/scoring";
import { retrieveRelevantContext } from "../rag/retrieve";
import { getBlockedTasks } from "../pulse/queries";
import { getFirmStudio } from "../platform/firm-studio";

async function isFullEsti(): Promise<boolean> {
  const studio = await getFirmStudio();
  if (!studio) return true;
  return studio.plan === "PROFESSIONAL" || studio.plan === "ENTERPRISE";
}

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
  fullEsti: boolean,
): Promise<{ text: string; sources: Record<string, unknown>[] }> {
  if (intent.intent === "LIST_PRIORITIES") {
    let scopedProjectId: string | null = null;
    let scopedProjectTitle: string | null = null;
    // Full ESTI only — Lite still answers unscoped, it just ignores the
    // project-name hint rather than refusing the question outright.
    if (fullEsti && intent.projectNameHint) {
      const { data: match } = await supabase
        .from("project_offices")
        .select("id, title")
        .ilike("title", `%${intent.projectNameHint}%`)
        .limit(1)
        .maybeSingle();
      if (match) {
        scopedProjectId = match.id as string;
        scopedProjectTitle = match.title as string;
      }
    }

    let query = supabase
      .from("tasks")
      .select("id, title, priority_score, project_offices(title)")
      .neq("status", "DONE")
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(50);
    if (scopedProjectId) query = query.eq("project_id", scopedProjectId);
    const { data } = await query;
    const rows = (data ?? []) as Row[];
    const filtered = intent.band
      ? rows.filter((r) => bandForScore((r.priority_score as number) ?? 0) === intent.band)
      : rows;
    const top = filtered.slice(0, 5);
    if (top.length === 0) {
      const scopeText = scopedProjectTitle ? ` on ${scopedProjectTitle}` : "";
      return { text: `No open tasks${intent.band ? ` in the ${PRIORITY_BAND_LABEL[intent.band]} band` : ""}${scopeText} right now.`, sources: [] };
    }
    const lines = top.map((r, i) => {
      const proj = projectOf(r);
      const band = bandForScore((r.priority_score as number) ?? 0);
      return `${i + 1}. ${r.title as string}${proj ? ` (${proj.title})` : ""} — ${PRIORITY_BAND_LABEL[band]}`;
    });
    const scopeText = scopedProjectTitle ? ` on ${scopedProjectTitle}` : "";
    return {
      text: `Top ${top.length} task${top.length === 1 ? "" : "s"} by priority${intent.band ? ` in ${PRIORITY_BAND_LABEL[intent.band]}` : ""}${scopeText}: ${lines.join(" ")}`,
      sources: top.map((r) => ({ type: "task", id: r.id })),
    };
  }

  if (intent.intent === "LIST_DEPENDENCY_BLOCKS") {
    if (!fullEsti) {
      return {
        text: "Blocked-by-dependency lookup is part of Full ESTI (Professional plan). Try asking about priorities, tasks, or missing gaps instead.",
        sources: [],
      };
    }
    const blocked = await getBlockedTasks(supabase, 10);
    if (blocked.length === 0) return { text: "Nothing is blocked on an open dependency right now.", sources: [] };
    const lines = blocked.map((b) => `${b.taskTitle} (blocked by: ${b.dependsOnTitle})`);
    return {
      text: `${blocked.length} task${blocked.length === 1 ? "" : "s"} blocked on an open dependency: ${lines.join("; ")}.`,
      sources: blocked.map((b) => ({ type: "taskDependency", id: b.dependencyId })),
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

  const intent: PulseIntent = classifyPulseIntent(question);
  const fullEsti = await isFullEsti();
  const { text: output, sources } = await buildDeterministicAnswer(supabase, intent, projectId, fullEsti);

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    project_id: projectId,
    kind: "PULSE_QUERY",
    provider: "template",
    model: "deterministic",
    prompt_summary: question.slice(0, 200),
    sources,
    output_text: output,
    used_external_api: "false",
    token_estimate: null,
  });

  return { output };
}
