/**
 * Dashboard data layer (2026-09-10 redesign) — one function per widget,
 * each running against the caller's own RLS-scoped Supabase client, same
 * pattern `app/(app)/dashboard/page.tsx` already used for its original
 * four widgets before this file existed. No service-role client
 * anywhere here — RLS stays the real access gate, this file just keeps
 * the growing list of queries out of the page component.
 *
 * Reused by both the dashboard page itself and `lib/actions/daily-
 * brief.ts` (the ESTI phraser reads the exact same data it renders, not
 * a separate summary — see docs/esti/DASHBOARD-AND-ESTI-PHRASER.md).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

function embedOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AbsenceToday = { id: string; teamMemberName: string; type: string; toDate: string };

/**
 * Who's on approved leave today — no office-wide reader of `leaves`
 * existed before this (only a per-team-member history view).
 *
 * `firmId` (2026-09-20) — optional, and only ever needed by a service-role
 * caller (app/api/pulse/snapshot-kpis/route.ts), which bypasses RLS
 * entirely and must scope explicitly per firm in its own per-firm loop.
 * Every other caller of this file's functions runs against a session-
 * bound client, where RLS already restricts every row to the caller's
 * own active firm — passing `firmId` there would be redundant, not wrong,
 * but is never necessary and every existing call site is left as-is.
 */
export async function getAbsencesToday(supabase: Client, today: string, firmId?: string): Promise<AbsenceToday[]> {
  let query = supabase
    .from("leaves")
    .select("id, type, to_date, team_members(name)")
    .eq("status", "APPROVED")
    .lte("from_date", today)
    .gte("to_date", today);
  if (firmId) query = query.eq("firm_id", firmId);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    teamMemberName: embedOne<{ name: string }>(r.team_members)?.name ?? "—",
    type: r.type,
    toDate: r.to_date,
  }));
}

export type ReadyToBillInvoice = { id: string; ref: string; projectTitle: string | null; netReceivablePaise: number };

/** Drafted invoices ready to issue — "ready to bill," not "billable
 * hours": there's no unbilled-time-entry table in this schema, so a
 * DRAFT invoice's own amount is the honest real-data mapping. */
export async function getReadyToBill(supabase: Client, firmId?: string): Promise<{ total: number; rows: ReadyToBillInvoice[] }> {
  let query = supabase
    .from("invoices")
    .select("id, ref, net_receivable_paise, project_offices(title)")
    .eq("status", "DRAFT")
    .order("net_receivable_paise", { ascending: false });
  if (firmId) query = query.eq("firm_id", firmId);
  const { data } = await query;
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    ref: r.ref,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    netReceivablePaise: r.net_receivable_paise ?? 0,
  }));
  return { total: rows.reduce((sum, r) => sum + r.netReceivablePaise, 0), rows };
}

export type AwaitingPaymentInvoice = {
  id: string;
  ref: string;
  projectTitle: string | null;
  outstandingPaise: number;
  daysSinceIssue: number | null;
};

/** Issued-not-paid invoices, oldest first — a proxy for "overdue."
 * Disclosed limitation: `invoices` has no payment-due-date column, only
 * `date_invoice` (the issue date) — this is "how long it's been issued
 * and unpaid," not a true contractual due date. */
export async function getAwaitingPayment(
  supabase: Client,
  today: string,
  firmId?: string,
): Promise<{ total: number; rows: AwaitingPaymentInvoice[] }> {
  let query = supabase
    .from("invoices")
    .select("id, ref, grand_total_paise, paid_paise, date_invoice, project_offices(title)")
    .eq("status", "ISSUED")
    .order("date_invoice", { ascending: true, nullsFirst: false });
  if (firmId) query = query.eq("firm_id", firmId);
  const { data } = await query;
  const todayMs = new Date(today).getTime();
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    ref: r.ref,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    outstandingPaise: (r.grand_total_paise ?? 0) - (r.paid_paise ?? 0),
    daysSinceIssue: r.date_invoice ? Math.floor((todayMs - new Date(r.date_invoice).getTime()) / 86_400_000) : null,
  }));
  return { total: rows.reduce((sum, r) => sum + r.outstandingPaise, 0), rows };
}

export type ApprovalRow = { id: string; title: string; projectTitle: string | null; recipient: string | null; date: string | null };

/** Approvals split into pending (sent, awaiting client response) and
 * recently approved (last 14 days) — `/approvals` today only shows raw
 * counts, this is the first office-wide "what's in each bucket" list. */
export async function getApprovalsSummary(
  supabase: Client,
  today: string,
): Promise<{ pending: ApprovalRow[]; recentlyApproved: ApprovalRow[] }> {
  const fourteenDaysAgo = new Date(new Date(today).getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: pending }, { data: approved }] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, title, recipient, sent_date, project_offices(title)")
      .eq("status", "SENT")
      .order("sent_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("approvals")
      .select("id, title, recipient, response_date, project_offices(title)")
      .eq("status", "APPROVED")
      .gte("response_date", fourteenDaysAgo)
      .order("response_date", { ascending: false }),
  ]);
  return {
    pending: (pending ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
      recipient: r.recipient,
      date: r.sent_date,
    })),
    recentlyApproved: (approved ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
      recipient: r.recipient,
      date: r.response_date,
    })),
  };
}

export type ClientRequest = {
  id: string;
  kind: string;
  subject: string;
  projectId: string;
  projectTitle: string | null;
  revisionCategory: string | null;
  createdAt: string;
};

/** Open client portal requests (change requests/feedback/meeting
 * requests — ACKNOWLEDGEMENT excluded, that's a client confirming
 * something, not raising one). New office-wide query: today only the
 * client's own portal reads `portal_submissions`. */
export async function getOpenClientRequests(supabase: Client, firmId?: string): Promise<ClientRequest[]> {
  let query = supabase
    .from("portal_submissions")
    .select("id, kind, subject, project_id, revision_category, created_at, project_offices(title)")
    .eq("status", "OPEN")
    .in("kind", ["CHANGE_REQUEST", "FEEDBACK", "MEETING_REQUEST"])
    .order("created_at", { ascending: true });
  if (firmId) query = query.eq("firm_id", firmId);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    subject: r.subject,
    projectId: r.project_id,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    revisionCategory: r.revision_category,
    createdAt: r.created_at,
  }));
}

export type ConsultantRequest = {
  id: string;
  kind: string;
  subject: string;
  projectTitle: string | null;
  consultantName: string | null;
  createdAt: string;
};

/** Open consultant submissions (RFI/deliverable/note/task) — real data
 * source, the Collaborator Portal already writes here. */
export async function getOpenConsultantRequests(supabase: Client, firmId?: string): Promise<ConsultantRequest[]> {
  let query = supabase
    .from("consultant_submissions")
    .select("id, kind, subject, created_at, project_offices(title), consultants(name)")
    .eq("status", "OPEN")
    .order("created_at", { ascending: true });
  if (firmId) query = query.eq("firm_id", firmId);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    subject: r.subject,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    consultantName: embedOne<{ name: string }>(r.consultants)?.name ?? null,
    createdAt: r.created_at,
  }));
}

export type OpenTender = { id: string; title: string; projectTitle: string | null; dueDate: string | null; invitationCount: number; bidCount: number };

/** Open tenders — invited/bid counts, contractor request equivalent for
 * work you're procuring rather than being asked something. */
export async function getOpenTenders(supabase: Client, firmId?: string): Promise<OpenTender[]> {
  let tendersQuery = supabase
    .from("tenders")
    .select("id, title, due_date, project_offices(title)")
    .eq("status", "OPEN")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (firmId) tendersQuery = tendersQuery.eq("firm_id", firmId);
  const { data: tenders } = await tendersQuery;
  const tenderRows = tenders ?? [];
  if (tenderRows.length === 0) return [];

  const tenderIds = tenderRows.map((t) => t.id);
  const { data: invitations } = await supabase.from("tender_invitations").select("id, tender_id").in("tender_id", tenderIds);
  const invitationRows = invitations ?? [];
  const invitationIds = invitationRows.map((i) => i.id);
  const { data: bids } = invitationIds.length
    ? await supabase.from("tender_bids").select("invitation_id").in("invitation_id", invitationIds)
    : { data: [] as { invitation_id: string }[] };

  const invitationToTender = new Map(invitationRows.map((i) => [i.id, i.tender_id]));
  const bidCountByTender = new Map<string, number>();
  for (const b of bids ?? []) {
    const tenderId = invitationToTender.get(b.invitation_id);
    if (tenderId) bidCountByTender.set(tenderId, (bidCountByTender.get(tenderId) ?? 0) + 1);
  }
  const invitationCountByTender = new Map<string, number>();
  for (const i of invitationRows) invitationCountByTender.set(i.tender_id, (invitationCountByTender.get(i.tender_id) ?? 0) + 1);

  return tenderRows.map((t) => ({
    id: t.id,
    title: t.title,
    projectTitle: embedOne<{ title: string }>(t.project_offices)?.title ?? null,
    dueDate: t.due_date,
    invitationCount: invitationCountByTender.get(t.id) ?? 0,
    bidCount: bidCountByTender.get(t.id) ?? 0,
  }));
}

export type ContractorSubmission = { id: string; kind: string; subject: string; createdAt: string };

/** Open contractor submissions — will return empty today: nothing in
 * the app writes to `contractor_submissions` yet (confirmed via a full
 * codebase search before this redesign). Deliberately still queried and
 * still rendered (its own honest empty state) rather than hidden, so
 * this real gap stays visible instead of quietly disappearing. */
export async function getOpenContractorSubmissions(supabase: Client): Promise<ContractorSubmission[]> {
  const { data } = await supabase
    .from("contractor_submissions")
    .select("id, kind, subject, created_at")
    .eq("status", "OPEN")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, subject: r.subject, createdAt: r.created_at }));
}

export type PendingDecision = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string | null;
  impact: string;
  reviewDeadline: string | null;
};

/** Decisions sent to the client for review (CRIF state CLIENT_REVIEW) —
 * awaiting an ACCEPTED/REJECTED response (see lib/decisions.ts's
 * DECISION_TRANSITIONS), the decision-register equivalent of `approvals`'
 * own pending bucket above. Moved here from an inline query in
 * dashboard/page.tsx (2026-09-13 restructure) so lib/dashboard/priority.ts
 * can pool it into the ranked Action Queue alongside tasks/approvals/
 * requests, not just display it in its own separate widget. */
export async function getPendingClientReviewDecisions(supabase: Client): Promise<PendingDecision[]> {
  const { data } = await supabase
    .from("decisions")
    .select("id, title, impact, review_deadline, project_id, project_offices(title)")
    .eq("state", "CLIENT_REVIEW")
    .order("review_deadline", { ascending: true, nullsFirst: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    projectId: r.project_id,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    impact: r.impact,
    reviewDeadline: r.review_deadline,
  }));
}

export type UnbilledRevision = { id: string; title: string; projectId: string; projectTitle: string | null; costDeltaPaise: number };

/**
 * "Fee-leakage detection" (2026-09-15) — closes a real pricing-page gap:
 * Professional's plan copy has promised this since the pricing rebuild
 * with no feature behind it. Honest scope: this is a review list, not
 * proof of a missed invoice — this schema has no link from a `decisions`
 * row to the `invoices` line item that eventually billed it (if any), so
 * "unbilled" can't be verified directly. What it *can* say truthfully:
 * every ACCEPTED/LOCKED revision that added fee (a positive
 * `cost_delta_paise`, migration 0051) is worth a human double-check
 * before the next invoice goes out — accepted revisions are exactly
 * where added scope most often never makes it onto an invoice. Surfaced
 * only to Professional-plan studios (see FinancialSummary in
 * app/(app)/pulse/page.tsx), same as the pricing page's own claim.
 */
export async function getUnbilledRevisions(supabase: Client, limit = 8): Promise<{ total: number; rows: UnbilledRevision[] }> {
  const { data } = await supabase
    .from("decisions")
    .select("id, title, project_id, cost_delta_paise, project_offices(title)")
    .in("state", ["ACCEPTED", "LOCKED"])
    .gt("cost_delta_paise", 0)
    .order("cost_delta_paise", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    projectId: r.project_id,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    costDeltaPaise: r.cost_delta_paise ?? 0,
  }));
  return { total: rows.reduce((sum, r) => sum + r.costDeltaPaise, 0), rows };
}

export type OpenTask = {
  id: string;
  title: string;
  projectId: string | null;
  projectTitle: string | null;
  priority: string;
  dueDate: string | null;
};

/** Open tasks (any assignee, not just the signed-in user — that's what
 * "My Tasks" is for) with a due date or high/critical priority, feeding
 * the priority scorer in `lib/dashboard/priority.ts`. */
export async function getOpenTasksForPriority(supabase: Client): Promise<OpenTask[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, project_id, priority, due_date, project_offices(title)")
    .neq("status", "DONE")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(50);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    projectId: r.project_id,
    projectTitle: embedOne<{ title: string }>(r.project_offices)?.title ?? null,
    priority: r.priority,
    dueDate: r.due_date,
  }));
}
