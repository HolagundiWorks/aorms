import { NextResponse } from "next/server";
import { createBearerClient, bearerTokenFrom } from "../../../../lib/supabase/bearer";
import { runAgenticChat } from "../../../../lib/ai/agent-loop";
import { ESTI_AGENT_SYSTEM } from "../../../../lib/ai/prompt";
import { studioSnapshotTool } from "../../../../lib/ai/tools/studio-snapshot";
import { listOpenTasksTool } from "../../../../lib/ai/tools/list-open-tasks";
import { searchProjectRecordsTool } from "../../../../lib/ai/tools/search-project-records";

/**
 * Mobile Esti — contextual commands, not a chatbot (Android IA spec,
 * ROADMAP.md). Deliberately a fixed command enum, not a free-text
 * question field: the app never sends arbitrary prompts, so "not a
 * general chatbot" is enforced here, not just left to the mobile UI's own
 * discipline. Otherwise identical plumbing to askEsti (lib/actions/ai.ts)
 * — same system prompt, same three tools, same ai_runs audit insert —
 * just reached over bearer auth instead of a cookie session, same
 * division of labour as inspections/route.ts.
 */
const MOCK_FALLBACK =
  "ESTI's local AI model isn't reachable right now (Ollama may not be running, or the model isn't pulled yet). Try again shortly.";

const COMMAND_QUESTIONS: Record<string, string> = {
  TODAY_FOCUS: "What should I focus on today? Give a short, direct summary of anything urgent or overdue.",
  PROJECT_SUMMARY: "Summarize this project's current status, recent activity, and anything that needs attention, based on its records.",
};

export async function POST(request: Request) {
  const token = bearerTokenFrom(request);
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const supabase = createBearerClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const command = String(body?.command ?? "");
  const projectId = body?.projectId ? String(body.projectId) : null;

  const question = COMMAND_QUESTIONS[command];
  if (!question) return NextResponse.json({ error: "Unknown command." }, { status: 400 });
  if (command === "PROJECT_SUMMARY" && !projectId) {
    return NextResponse.json({ error: "Project is required for this command." }, { status: 400 });
  }

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from("project_offices")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const result = await runAgenticChat({
    system: ESTI_AGENT_SYSTEM,
    user: question,
    tools: [studioSnapshotTool, listOpenTasksTool, searchProjectRecordsTool],
    context: { supabase, projectId },
    fallback: MOCK_FALLBACK,
  });

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    kind: "AGENT_QA",
    provider: result.provider,
    model: result.model,
    prompt_summary: `[mobile] ${command}${projectId ? `: ${projectId}` : ""}`,
    sources: result.toolsUsed.map((name) => ({ type: "tool", name })),
    output_text: result.output,
    used_external_api: "false",
    token_estimate: result.tokenEstimate === null ? null : String(result.tokenEstimate),
  });

  return NextResponse.json({ output: result.output });
}
