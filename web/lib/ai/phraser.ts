/**
 * ESTI's daily-brief phraser (2026-09-10) — deterministic "structured
 * data → sentence" template, the same pattern `draft-prompts.ts`'s
 * per-kind fallback templates already use (e.g. `BILLING_ASSISTANT`'s
 * `rows.map(r => ...)` line), extended here to a studio-wide brief.
 *
 * This is the *guaranteed-correct* output — plain string interpolation
 * over real numbers already fetched by `lib/dashboard/queries.ts`/
 * `priority.ts`, zero hallucination risk. `lib/actions/daily-brief.ts`
 * may optionally send this exact text to Ollama to rephrase for warmth/
 * clarity — never to add facts — but this function's own output is
 * always correct on its own, with or without that step. See
 * docs/esti/DASHBOARD-AND-ESTI-PHRASER.md for the full pipeline.
 */
import type { AbsenceToday, ApprovalRow, ClientRequest, ConsultantRequest, OpenTender, ContractorSubmission } from "../dashboard/queries";
import type { PriorityItem } from "../dashboard/priority";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export type DailyBriefData = {
  absences: AbsenceToday[];
  readyToBillTotal: number;
  readyToBillCount: number;
  awaitingPaymentTotal: number;
  awaitingPaymentCount: number;
  approvals: { pending: ApprovalRow[]; recentlyApproved: ApprovalRow[] };
  clientRequests: ClientRequest[];
  consultantRequests: ConsultantRequest[];
  openTenders: OpenTender[];
  contractorSubmissions: ContractorSubmission[];
  topPriorities: PriorityItem[];
  includeFinancials: boolean;
};

const KIND_LABEL: Record<PriorityItem["kind"], string> = {
  TASK: "task",
  APPROVAL: "approval awaiting response",
  CLIENT_REQUEST: "client request",
  CONSULTANT_REQUEST: "consultant request",
};

export function buildDailyBriefText(data: DailyBriefData): string {
  const lines: string[] = [];

  // Absences
  if (data.absences.length === 0) {
    lines.push("Everyone's in today — no one is on approved leave.");
  } else {
    const names = data.absences.map((a) => a.teamMemberName).join(", ");
    lines.push(`${data.absences.length === 1 ? `${names} is` : `${names} are`} on leave today.`);
  }

  // Billing / payments — omitted entirely for a caller without
  // financial rank, not shown as "hidden," just absent from the text.
  if (data.includeFinancials) {
    if (data.readyToBillCount > 0) {
      lines.push(
        `${formatInr(data.readyToBillTotal)} is ready to bill across ${data.readyToBillCount} drafted invoice${data.readyToBillCount === 1 ? "" : "s"}.`,
      );
    }
    if (data.awaitingPaymentCount > 0) {
      lines.push(
        `${formatInr(data.awaitingPaymentTotal)} is still awaiting payment across ${data.awaitingPaymentCount} issued invoice${data.awaitingPaymentCount === 1 ? "" : "s"}.`,
      );
    }
    if (data.readyToBillCount === 0 && data.awaitingPaymentCount === 0) {
      lines.push("Nothing drafted or outstanding on the billing side right now.");
    }
  }

  // Requests — one combined line across the three request sources.
  const requestCount = data.clientRequests.length + data.consultantRequests.length + data.openTenders.length;
  if (requestCount > 0) {
    const parts: string[] = [];
    if (data.clientRequests.length > 0) parts.push(`${data.clientRequests.length} from clients`);
    if (data.consultantRequests.length > 0) parts.push(`${data.consultantRequests.length} from consultants`);
    if (data.openTenders.length > 0) parts.push(`${data.openTenders.length} open tender${data.openTenders.length === 1 ? "" : "s"} awaiting bids`);
    lines.push(`${requestCount} open request${requestCount === 1 ? "" : "s"} need attention — ${parts.join(", ")}.`);
  } else {
    lines.push("No open client or consultant requests right now.");
  }
  if (data.approvals.pending.length > 0) {
    lines.push(`${data.approvals.pending.length} approval${data.approvals.pending.length === 1 ? " is" : "s are"} still awaiting client response.`);
  }
  if (data.contractorSubmissions.length > 0) {
    lines.push(`${data.contractorSubmissions.length} contractor submission${data.contractorSubmissions.length === 1 ? "" : "s"} awaiting review.`);
  }

  // Top 3
  if (data.topPriorities.length > 0) {
    const items = data.topPriorities
      .map((p, i) => `${i + 1}. ${p.title}${p.projectTitle ? ` (${p.projectTitle})` : ""} — ${KIND_LABEL[p.kind]}`)
      .join(" ");
    lines.push(`Top priorities today: ${items}`);
  } else {
    lines.push("Nothing urgent stands out today.");
  }

  return lines.join(" ");
}

/** Bounded rephrase instruction — Ollama may only reword this exact
 * text, never add a fact, name, or number not already in it. */
export const PHRASER_REPHRASE_SYSTEM =
  "You rephrase office-management summaries for clarity and warmth. Rephrase the user's message only — " +
  "do not add any fact, name, number, or claim that isn't already present in it. Do not invent anything. " +
  "Keep it to 4-6 short sentences, plain language, no headings or bullet points.";
