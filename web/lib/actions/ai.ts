"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "../ai/ollama";
import { redactPii } from "../ai/redact";
import { ESTI_AGENT_SYSTEM } from "../ai/prompt";
import { buildLiveSnapshot } from "../ai/snapshot";
import { draftKindNeedsProject, isAiDraftKind, type AiDraftKind } from "../ai/draft-kinds";
import { buildDraftPrompt } from "../ai/draft-prompts";

/**
 * ESTI agent — read-only Q&A mode (the "agent" half of the old backend's
 * draft-vs-agent split, see NEXTJS-MIGRATION-PHASE7-AUDIT.md). Any
 * authenticated office-hub user can ask; no `write` capability needed
 * (that's only for the draft-generation modes, not ported here).
 *
 * Every call is recorded in ai_runs (migration 0010, already live) —
 * provenance regardless of whether Ollama actually answered or the mock
 * fallback did, matching the old gateway's "always return something, be
 * honest about the fallback" behaviour (backend/src/lib/ai/gateway.ts).
 */

export type AskEstiState = { output: string; error?: string } | null;

const MOCK_FALLBACK =
  "ESTI's local AI model isn't reachable right now (Ollama may not be running, or the model isn't pulled yet). Ask your admin to check the Ollama container, or try again shortly.";

export async function askEsti(_prev: AskEstiState, formData: FormData): Promise<AskEstiState> {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { output: "", error: "Ask a question first." };
  if (question.length > 2000) return { output: "", error: "Keep the question under 2000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { output: "", error: "Sign in to ask ESTI." };

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  const snapshot = await buildLiveSnapshot(supabase);
  const userPrompt = `Live snapshot:\n${snapshot}\n\nQuestion: ${question}`;

  let output: string;
  let provider: string;
  let usedModel: string;
  let tokenEstimate: number | null = null;

  const health = await checkOllamaHealth({ baseUrl, model });
  if (health.ok) {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl,
        model,
        system: ESTI_AGENT_SYSTEM,
        user: userPrompt,
      });
      output = redactPii(text);
      provider = "ollama";
      usedModel = model;
      tokenEstimate = tokens;
    } catch (err) {
      const hint = err instanceof Error ? err.message : "Ollama call failed";
      output = `${MOCK_FALLBACK}\n\n*(${hint.slice(0, 160)})*`;
      provider = "mock";
      usedModel = "template-fallback";
    }
  } else {
    output = `${MOCK_FALLBACK}\n\n*(${health.error ?? "model not ready"})*`;
    provider = "mock";
    usedModel = "template-fallback";
  }

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    kind: "AGENT_QA",
    provider,
    model: usedModel,
    prompt_summary: question.slice(0, 200),
    sources: [],
    output_text: output,
    used_external_api: "false",
    token_estimate: tokenEstimate === null ? null : String(tokenEstimate),
  });

  return { output };
}

/**
 * AI Studio — document drafting (the "draft" half of the old backend's
 * draft-vs-agent split, not ported when askEsti shipped; see draft-kinds.ts
 * and draft-prompts.ts's own header comments). Gated to `write`-tier roles
 * only, matching modules/ai/router.ts's `can(ctx.user.role, "write")` check
 * — that tier isn't encoded in ai_runs' RLS (bare is_office_staff(), same
 * as the old router's protectedProcedure/no-capability-check on the table
 * itself), so it's re-checked here at the app layer, the same way this
 * repo's other role-tiered business rules that RLS can't express are.
 */

const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export type GenerateAiDraftState = { error: string } | null;

export async function generateAiDraft(_prev: GenerateAiDraftState, formData: FormData): Promise<GenerateAiDraftState> {
  const kindRaw = String(formData.get("kind") ?? "");
  if (!isAiDraftKind(kindRaw)) return { error: "Pick a draft kind." };
  const kind: AiDraftKind = kindRaw;

  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  if (draftKindNeedsProject(kind) && !projectId) return { error: "Pick a project for this draft kind." };

  const userPrompt = String(formData.get("prompt") ?? "").trim().slice(0, 4000) || undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to use AI Studio." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !WRITE_TIER_ROLES.has(profile.role)) {
    return { error: "Document drafts need write access (Associate and above) — use Ask ESTI for questions instead." };
  }

  let project: { ref: string; title: string; clientName?: string | null; status?: string | null } | undefined;
  if (projectId) {
    const { data: proj, error: projError } = await supabase
      .from("project_offices")
      .select("ref, title, status, clients(name)")
      .eq("id", projectId)
      .maybeSingle();
    if (projError) return { error: projError.message };
    if (!proj) return { error: "Project not found." };
    const client = Array.isArray(proj.clients) ? proj.clients[0] : (proj.clients as { name: string } | null);
    project = { ref: proj.ref, title: proj.title, status: proj.status, clientName: client?.name ?? null };
  }

  let billing: { outstanding: { ref: string; projectRef: string; daysSinceIssue: number; outstandingPaise: number }[] } | undefined;
  if (kind === "BILLING_ASSISTANT") {
    // Same "issued, PostgREST can't compare paid_paise < grand_total_paise
    // directly" limitation snapshot.ts already documents — fetch ISSUED
    // invoices and compute the outstanding amount in JS instead of a filter.
    const { data: issued } = await supabase
      .from("invoices")
      .select("ref, paid_paise, grand_total_paise, date_invoice, project_offices(ref)")
      .eq("status", "ISSUED")
      .order("date_invoice", { ascending: true })
      .limit(30);
    const today = Date.now();
    const outstanding = (issued ?? [])
      .map((inv) => {
        const proj = Array.isArray(inv.project_offices) ? inv.project_offices[0] : (inv.project_offices as { ref: string } | null);
        const outstandingPaise = (inv.grand_total_paise ?? 0) - (inv.paid_paise ?? 0);
        const daysSinceIssue = inv.date_invoice
          ? Math.max(0, Math.floor((today - new Date(inv.date_invoice).getTime()) / 86_400_000))
          : 0;
        return { ref: inv.ref, projectRef: proj?.ref ?? "—", daysSinceIssue, outstandingPaise };
      })
      .filter((r) => r.outstandingPaise > 0)
      .slice(0, 15);
    billing = { outstanding };
  }

  const { data: firm } = await supabase.from("firm").select("company_name").limit(1).maybeSingle();

  const built = buildDraftPrompt(kind, { project, billing, userPrompt, firmName: firm?.company_name || undefined });

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  let output: string;
  let provider: string;
  let usedModel: string;
  let tokenEstimate: number | null = null;

  const health = await checkOllamaHealth({ baseUrl, model });
  if (health.ok) {
    try {
      const { text, tokens } = await callOllamaChat({ baseUrl, model, system: built.system, user: built.user });
      output = redactPii(text);
      provider = "ollama";
      usedModel = model;
      tokenEstimate = tokens;
    } catch {
      output = built.fallback;
      provider = "mock";
      usedModel = "template-fallback";
    }
  } else {
    output = built.fallback;
    provider = "mock";
    usedModel = "template-fallback";
  }

  const { data: row, error } = await supabase
    .from("ai_runs")
    .insert({
      user_id: user.id,
      project_id: projectId,
      kind,
      provider,
      model: usedModel,
      prompt_summary: built.promptSummary,
      sources: [],
      output_text: output,
      approval_state: "DRAFT",
      used_external_api: "false",
      token_estimate: tokenEstimate === null ? null : String(tokenEstimate),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/ai-runs");
  redirect(`/ai-runs/${row.id}`);
}

const APPROVAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED", "REJECTED"],
  APPROVED: ["ISSUED", "REJECTED"],
  REJECTED: ["DRAFT"],
};

/** Moves an ai_runs row through DRAFT → APPROVED/REJECTED → ISSUED. ISSUED is a locked terminal state, matching the old router's updateRun guard. */
export async function updateAiRunApproval(runId: string, nextState: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to use AI Studio." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !WRITE_TIER_ROLES.has(profile.role)) {
    return { error: "Only write-access staff can change a draft's approval state." };
  }

  const { data: before, error: beforeError } = await supabase
    .from("ai_runs")
    .select("approval_state")
    .eq("id", runId)
    .maybeSingle();
  if (beforeError) return { error: beforeError.message };
  if (!before) return { error: "Run not found." };
  if (!APPROVAL_TRANSITIONS[before.approval_state]?.includes(nextState)) {
    return { error: `Can't move ${before.approval_state} → ${nextState}.` };
  }

  const { error } = await supabase.from("ai_runs").update({ approval_state: nextState }).eq("id", runId);
  if (error) return { error: error.message };

  revalidatePath(`/ai-runs/${runId}`);
  revalidatePath("/ai-runs");
  return {};
}
