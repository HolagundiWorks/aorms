/**
 * AI Studio draft kinds — the "draft" half of the old backend's draft-vs-
 * agent split (backend/src/lib/ai/aorms-operator.ts), not ported when the
 * read-only "Ask ESTI" agent shipped 2026-09-06 (see prompt.ts's own header
 * comment). Narrower than the old contracts' `AiDraftKind` (packages/
 * contracts/src/ai.ts, 14 kinds): CRIF_SUMMARY/CRIF_IMPACT/CRIF_RISK
 * shipped 2026-09-09 once migration 0034 gave web/ a real `decisions`
 * table to read (see lib/decisions.ts). MOM_REVISIONS and CPI_REPORT
 * remain out — both are strict-JSON-output kinds needing a real review UI
 * for the parsed result (MOM_REVISIONS: suggested client change requests;
 * CPI_REPORT: the CpiReportShape fields CpiReportPanel currently only
 * edits by hand), each a separable follow-up rather than built half-way
 * here.
 */

export const AI_DRAFT_KINDS = [
  "PROPOSAL",
  "SCOPE",
  "AGREEMENT",
  "SPEC",
  "SITE_REPORT",
  "MOM",
  "RFI_RESPONSE",
  "SUMMARY",
  "BILLING_ASSISTANT",
  "CRIF_SUMMARY",
  "CRIF_IMPACT",
  "CRIF_RISK",
] as const;

export type AiDraftKind = (typeof AI_DRAFT_KINDS)[number];

export function isAiDraftKind(value: string): value is AiDraftKind {
  return (AI_DRAFT_KINDS as readonly string[]).includes(value);
}

export const AI_DRAFT_KIND_LABEL: Record<AiDraftKind, string> = {
  PROPOSAL: "Fee proposal narrative",
  SCOPE: "Scope of services",
  AGREEMENT: "Agreement clause draft",
  SPEC: "Specification note",
  SITE_REPORT: "Site report narrative",
  MOM: "Meeting minutes",
  RFI_RESPONSE: "RFI / consultant response",
  SUMMARY: "Project summary",
  BILLING_ASSISTANT: "Billing assistant (office-wide)",
  CRIF_SUMMARY: "CRIF revision summary",
  CRIF_IMPACT: "CRIF impact statement",
  CRIF_RISK: "CRIF risk flags",
};

/** BILLING_ASSISTANT is office-wide; every other kind needs a project. */
export function draftKindNeedsProject(kind: AiDraftKind): boolean {
  return kind !== "BILLING_ASSISTANT";
}
