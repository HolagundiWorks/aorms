import type { AiDraftKind } from "./draft-kinds";

/**
 * Per-kind draft prompts + the deterministic fallback template. Ported from
 * backend/src/lib/ai/templates.ts's `buildTemplateDraft()` — that function
 * WAS the old system's "mock" provider's actual output (AiProvider had two
 * real options, `ollama` and `mock`, not an error-only fallback), so the
 * fallback text below is used the same way here: whenever Ollama is
 * unreachable or the model isn't pulled, the draft IS this template
 * (provider recorded as "mock"), not an apology — a structured draft is
 * more useful than "try again later" for this feature, unlike Ask ESTI's
 * Q&A fallback.
 */

export type DraftProjectCtx = {
  ref: string;
  title: string;
  clientName?: string | null;
  status?: string | null;
};

export type DraftBillingCtx = {
  outstanding: { ref: string; projectRef: string; daysSinceIssue: number; outstandingPaise: number }[];
};

/** The project's own decisions/CRIF register rows — feeds the three
 * CRIF_* draft kinds (migration 0034). */
export type DraftDecisionsCtx = {
  decisions: {
    title: string;
    rationale: string;
    state: string;
    impact: string;
    revisionCategory: string | null;
    revisionSource: string | null;
    reviewDeadline: string | null;
  }[];
};

export type DraftPromptResult = {
  system: string;
  user: string;
  promptSummary: string;
  fallback: string;
};

const STUDIO_PREAMBLE = `You are ESTI's AI Studio, drafting office documents for AORMS — the web office hub for an Indian architecture practice. Write the draft directly, in the requested document's own voice (no meta-commentary, no "Here is your draft"). Ground every specific figure, name, or reference strictly in the context given — never invent client names, amounts, or dates not provided. End with a short italic note that this is a draft requiring human review before issue, matching this firm's own document conventions.`;

const KIND_INSTRUCTION: Record<AiDraftKind, string> = {
  PROPOSAL:
    "Draft a fee proposal narrative: scope highlights (architectural design + working drawings, authority liaison/compliance, site coordination) and a professional-fees paragraph referencing the firm's phase-wise fee schedule. Markdown, headed sections.",
  SCOPE:
    "Draft a scope-of-services document: numbered Included items (site assessment, schematic/detailed drawings, BOQ support, submission drawings, authority responses) and an Excluded section (structural/MEP by consultants, survey by client unless noted). Markdown.",
  AGREEMENT:
    "Draft agreement clauses covering Services (per Council of Architecture conditions of engagement), Fees (phase-wise, late-payment interest), and Intellectual Property (architect retains copyright, client gets a project-site licence). Markdown, bold clause headings.",
  SPEC:
    "Draft a specification note covering Masonry, RCC grade/cover, and Finishes, in the register style of an Indian architectural spec sheet (IS-code references where standard). Markdown.",
  SITE_REPORT:
    "Draft a site inspection report: date/weather/attendees fields, an Observations section (structural/finishing progress, discrepancies), and an Actions section (numbered, with the responsible party). Markdown.",
  MOM: "Draft meeting minutes: date/venue/present fields, an Agenda, a Discussion summary, and an Action Items table (# / Action / Owner / Due).",
  RFI_RESPONSE:
    "Draft a response to a consultant/site RFI: acknowledge the query, answer by referencing the relevant drawing/detail, and ask for confirmation of receipt.",
  SUMMARY:
    "Draft a concise project summary: client, current stage, and a short narrative of design/coordination progress and key risks, suitable for internal or client circulation.",
  BILLING_ASSISTANT:
    "Draft an office-wide billing assistant note: list the outstanding (issued, not fully paid) invoices given, oldest first, then 2-3 suggested next steps (reminders, GST/TDS treatment check before month-end filing). This is advisory only — never claim an invoice was sent or an action taken.",
  CRIF_SUMMARY:
    "Draft a CRIF (Critical Revision Information Flow) revision summary: group the decisions given by state, and for each one give a one-line plain-language summary of what changed and why. Markdown, grouped headings.",
  CRIF_IMPACT:
    "Draft a CRIF impact statement: for each decision given, state its impact level (Low/Medium/High) and a short paragraph on what that impact means for cost, schedule, or scope — grounded strictly in the rationale/category/source given, never invented.",
  CRIF_RISK:
    "Draft a CRIF risk-flags note: flag decisions that are CRITICAL category, HIGH impact, or past their review deadline (if a deadline is given) as needing urgent attention, then list the rest as routine. This is advisory only.",
};

function projectHeader(project?: DraftProjectCtx): string {
  return project ? `Project ${project.ref} — ${project.title}` : "Office-wide context";
}

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function buildDraftPrompt(
  kind: AiDraftKind,
  ctx: {
    project?: DraftProjectCtx;
    billing?: DraftBillingCtx;
    decisions?: DraftDecisionsCtx;
    userPrompt?: string;
    firmName?: string;
  },
): DraftPromptResult {
  const firm = ctx.firmName?.trim() || "the firm";
  const header = projectHeader(ctx.project);
  const extraInstruction = ctx.userPrompt?.trim() ? `\n\nAdditional instructions from the requester:\n${ctx.userPrompt.trim()}` : "";
  const extraFallback = ctx.userPrompt?.trim() ? `\n\nAdditional instructions:\n${ctx.userPrompt.trim()}` : "";

  let contextBlock: string;
  let fallback: string;

  switch (kind) {
    case "PROPOSAL":
      contextBlock = `Firm: ${firm}\n${header}\nClient: ${ctx.project?.clientName ?? "the client"}`;
      fallback = `# Fee proposal narrative (draft)\n\n${header}\n\n${firm} proposes architectural services for ${ctx.project?.clientName ?? "the client"} covering concept through GFC documentation, statutory submissions, and site coordination during construction.\n\n## Scope highlights\n- Architectural design and working drawings\n- Authority liaison and compliance documentation\n- Periodic site visits and consultant coordination\n\n## Professional fees\nFees shall follow the agreed phase-wise fee schedule linked to deliverables and issue dates.\n\n*Draft — review and edit before issue.*${extraFallback}`;
      break;
    case "SCOPE":
      contextBlock = `Firm: ${firm}\n${header}`;
      fallback = `# Scope of services (draft)\n\n${header}\n\n## Included\n1. Site assessment and design brief confirmation\n2. Schematic and detailed architectural drawings\n3. BOQ support and specification sheets\n4. Submission drawings and authority responses\n\n## Excluded\n- Structural / MEP detailed design (by respective consultants)\n- Soil investigation and survey (client scope unless noted)\n\n*Draft — human issue required.*${extraFallback}`;
      break;
    case "AGREEMENT":
      contextBlock = `Firm: ${firm}\n${header}`;
      fallback = `# Agreement clause draft\n\n${header}\n\n**Services.** The Architect shall provide professional services as described in the scope letter dated [●], in accordance with Council of Architecture conditions of engagement.\n\n**Fees.** Fees are payable phase-wise upon issue of deliverables. Late payment beyond 30 days shall attract interest at 1.5% per month on outstanding amounts.\n\n**Intellectual property.** Drawings remain the Architect's copyright; the Client receives a licence for the specific project site only.\n\n*Draft clause set — legal review required before execution.*${extraFallback}`;
      break;
    case "SPEC":
      contextBlock = `${header}`;
      fallback = `# Specification note (draft)\n\n${header}\n\n## Masonry\n230 mm brick masonry in cement mortar (1:6) for external walls; 115 mm partition walls in CM (1:4).\n\n## RCC\nM25 grade concrete for slabs, beams, columns; cover as per IS 456.\n\n## Finishes\nInternal plaster 12 mm CM (1:4); vitrified flooring to wet areas as per material schedule.\n\n*Draft — align with issued spec catalogue.*${extraFallback}`;
      break;
    case "SITE_REPORT":
      contextBlock = `${header}`;
      fallback = `# Site inspection report (draft)\n\n${header}\n\n**Date:** [●]\n**Weather:** Clear\n**Attendees:** Architect site team, contractor supervisor\n\n## Observations\n- [Note structural/finishing progress against the last issued drawing]\n- [Note any discrepancy or pending item]\n\n## Actions\n1. [Action] — [Owner]\n2. [Action] — [Owner]\n\n*Draft — attach photos before issue.*${extraFallback}`;
      break;
    case "MOM":
      contextBlock = `${header}`;
      fallback = `# Meeting minutes (draft)\n\n${header}\n\n**Date:** [●]  **Venue:** Site office / video\n**Present:** Client, architect team, contractor\n\n## Agenda\n1. Progress vs programme\n2. Drawing revisions pending\n3. Upcoming billing milestone\n\n## Discussion\n[Summarize key points raised]\n\n## Action items\n| # | Action | Owner | Due |\n|---|--------|-------|-----|\n| 1 | [●] | [●] | [●] |\n\n*Draft — edit and issue from the Meeting Minutes module.*${extraFallback}`;
      break;
    case "RFI_RESPONSE":
      contextBlock = `${header}`;
      fallback = `# RFI response (draft)\n\n${header}\n\n**Subject:** [RFI reference]\n\nThank you for your query. Based on the latest issued drawing set:\n\n- [Reference the relevant drawing/detail]\n- [State the governing dimension or clearance]\n\nPlease confirm receipt. Further clarifications may be logged via the consultant portal.\n\n*Draft — verify drawing references before sending.*${extraFallback}`;
      break;
    case "SUMMARY":
      contextBlock = `${header}\nStatus: ${ctx.project?.status ?? "In progress"}`;
      fallback = `# Project summary (draft)\n\n${header}\n\n${ctx.project?.clientName ? `Client: ${ctx.project.clientName}\n` : ""}Status: ${ctx.project?.status ?? "In progress"}\n\nThe project is progressing through design development with active coordination on structural and services interfaces.\n\n*Draft summary for internal / client communication.*${extraFallback}`;
      break;
    case "BILLING_ASSISTANT": {
      const rows = ctx.billing?.outstanding ?? [];
      const lines = rows.length
        ? rows.map((r) => `- ${r.ref} (${r.projectRef}) — ${formatInr(r.outstandingPaise)} outstanding, issued ${r.daysSinceIssue} day(s) ago`).join("\n")
        : "- No outstanding invoices right now";
      contextBlock = `Firm: ${firm}\nOutstanding invoices:\n${lines}`;
      fallback = `# Billing assistant (draft)\n\n## Outstanding invoices\n${lines}\n\n## Suggested next steps\n1. Send payment reminders on the oldest outstanding invoices with a ledger statement\n2. Confirm GST/TDS treatment before month-end filing\n3. Follow up directly on any invoice outstanding beyond 30 days\n\n*Advisory draft only — no reminder sent automatically.*${extraFallback}`;
      break;
    }
    case "CRIF_SUMMARY": {
      const rows = ctx.decisions?.decisions ?? [];
      const lines = rows.length
        ? rows.map((d) => `- [${d.state}] ${d.title}${d.revisionCategory ? ` (${d.revisionCategory})` : ""}: ${d.rationale}`).join("\n")
        : "- No decisions logged for this project yet";
      contextBlock = `${header}\nDecisions:\n${lines}`;
      fallback = `# CRIF revision summary (draft)\n\n${header}\n\n${lines}\n\n*Draft — review before circulating.*${extraFallback}`;
      break;
    }
    case "CRIF_IMPACT": {
      const rows = ctx.decisions?.decisions ?? [];
      const lines = rows.length
        ? rows.map((d) => `- ${d.title} — Impact: ${d.impact}. ${d.rationale}`).join("\n")
        : "- No decisions logged for this project yet";
      contextBlock = `${header}\nDecisions and impact:\n${lines}`;
      fallback = `# CRIF impact statement (draft)\n\n${header}\n\n${lines}\n\n*Draft — impact assessment for internal review.*${extraFallback}`;
      break;
    }
    case "CRIF_RISK": {
      const rows = ctx.decisions?.decisions ?? [];
      const urgent = rows.filter((d) => d.revisionCategory === "CRITICAL" || d.impact === "HIGH");
      const routine = rows.filter((d) => !(d.revisionCategory === "CRITICAL" || d.impact === "HIGH"));
      const urgentLines = urgent.length ? urgent.map((d) => `- ${d.title} (${d.state}) — needs urgent attention`).join("\n") : "- None";
      const routineLines = routine.length ? routine.map((d) => `- ${d.title} (${d.state})`).join("\n") : "- None";
      contextBlock = `${header}\nDecisions:\n${rows.map((d) => `- ${d.title}: category ${d.revisionCategory ?? "—"}, impact ${d.impact}, deadline ${d.reviewDeadline ?? "—"}`).join("\n") || "- None logged yet"}`;
      fallback = `# CRIF risk flags (draft)\n\n${header}\n\n## Needs urgent attention\n${urgentLines}\n\n## Routine\n${routineLines}\n\n*Advisory draft only.*${extraFallback}`;
      break;
    }
  }

  const system = `${STUDIO_PREAMBLE}\n\nDocument to draft: ${KIND_INSTRUCTION[kind]}`;
  const user = `Context:\n${contextBlock}${extraInstruction}\n\nWrite the draft now.`;

  return { system, user, promptSummary: `${kind}${ctx.project ? ` — ${ctx.project.ref}` : ""}`, fallback };
}
