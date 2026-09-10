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

/** Who's on approved leave today — no office-wide reader of `leaves`
 * existed before this (only a per-team-member history view). */
export async function getAbsencesToday(supabase: Client, today: string): Promise<AbsenceToday[]> {
  const { data } = await supabase
    .from("leaves")
    .select("id, type, to_date, team_members(name)")
    .eq("status", "APPROVED")
    .lte("from_date", today)
    .gte("to_date", today);
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
export async function getReadyToBill(supabase: Client): Promise<{ total: number; rows: ReadyToBillInvoice[] }> {
  const { data } = await supabase
    .from("invoices")
    .select("id, ref, net_receivable_paise, project_offices(title)")
    .eq("status", "DRAFT")
    .order("net_receivable_paise", { ascending: false });
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
): Promise<{ total: number; rows: AwaitingPaymentInvoice[] }> {
  const { data } = await supabase
    .from("invoices")
    .select("id, ref, grand_total_paise, paid_paise, date_invoice, project_offices(title)")
    .eq("status", "ISSUED")
    .order("date_invoice", { ascending: true, nullsFirst: false });
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
export async function getOpenClientRequests(supabase: Client): Promise<ClientRequest[]> {
  const { data } = await supabase
    .from("portal_submissions")
    .select("id, kind, subject, project_id, revision_category, created_at, project_offices(title)")
    .eq("status", "OPEN")
    .in("kind", ["CHANGE_REQUEST", "FEEDBACK", "MEETING_REQUEST"])
    .order("created_at", { ascending: true });
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
export async function getOpenConsultantRequests(supabase: Client): Promise<ConsultantRequest[]> {
  const { data } = await supabase
    .from("consultant_submissions")
    .select("id, kind, subject, created_at, project_offices(title), consultants(name)")
    .eq("status", "OPEN")
    .order("created_at", { ascending: true });
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
export async function getOpenTenders(supabase: Client): Promise<OpenTender[]> {
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, title, due_date, project_offices(title)")
    .eq("status", "OPEN")
    .order("due_date", { ascending: true, nullsFirst: false });
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
