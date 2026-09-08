/**
 * AI Studio draft kinds — the "draft" half of the old backend's draft-vs-
 * agent split (backend/src/lib/ai/aorms-operator.ts), not ported when the
 * read-only "Ask ESTI" agent shipped 2026-09-06 (see prompt.ts's own header
 * comment). This is a deliberately narrower set than the old contracts'
 * `AiDraftKind` (packages/contracts/src/ai.ts, 14 kinds): CRIF_SUMMARY/
 * CRIF_IMPACT/CRIF_RISK need a decisions/CRIF register that was never
 * ported to web/ (no `decisions` table exists — CLAUDE.md's "Revision
 * types" convention lives only on the old frontend), MOM_REVISIONS needs
 * the client-portal MoM-acknowledgement flow's strict-JSON parsing (a
 * separate, more involved port), and CPI_REPORT needs the full CPI
 * questionnaire data assembled — none of those have a real, ready data
 * source here, so they're left out rather than built against nothing real.
 * The 9 kinds below all map onto real web/ tables/queries.
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
};

/** BILLING_ASSISTANT is office-wide; every other kind needs a project. */
export function draftKindNeedsProject(kind: AiDraftKind): boolean {
  return kind !== "BILLING_ASSISTANT";
}
