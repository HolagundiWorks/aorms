import { Grid, Column, Tile, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { hasRank } from "../../../lib/auth/rank";
import { KpiTile as Kpi } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { DashboardWidget, EmptyRow, WidgetRow } from "../../../components/aorms/dashboard/DashboardWidget";
import { TodaysBrief } from "../../../components/aorms/dashboard/TodaysBrief";
import { TopPriorities } from "../../../components/aorms/dashboard/TopPriorities";
import { getTopPriorities } from "../../../lib/dashboard/priority";
import {
  getAbsencesToday,
  getApprovalsSummary,
  getAwaitingPayment,
  getOpenClientRequests,
  getOpenConsultantRequests,
  getOpenContractorSubmissions,
  getOpenTenders,
  getReadyToBill,
} from "../../../lib/dashboard/queries";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const PRIORITY_TAG: Record<string, "gray" | "blue" | "magenta" | "red"> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "magenta",
  CRITICAL: "red",
};

const IMPACT_TAG: Record<string, "gray" | "purple" | "red"> = {
  LOW: "gray",
  MEDIUM: "purple",
  HIGH: "red",
};

const REQUEST_KIND_LABEL: Record<string, string> = {
  CHANGE_REQUEST: "Change request",
  FEEDBACK: "Feedback",
  MEETING_REQUEST: "Meeting request",
  RFI: "RFI",
  DELIVERABLE: "Deliverable",
  NOTE: "Note",
  TASK: "Task",
};

/**
 * Financial KPIs gated to invoice:manage, same tier Phase 3 deliberately
 * used for raw invoice reads — closes the RLS gap the Phase 5 audit
 * flagged (the current backend's dashboard.financialHealth runs on bare
 * protectedProcedure, letting any staff incl. VIEWER see firm-wide
 * revenue through a side door the invoices router itself closed). Decided
 * on purpose here, per the audit's own recommended resolution — not a
 * silent port either way.
 */
async function FinancialSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!hasRank(profile?.role, 80)) return null;

  const { data: invoices } = await supabase.from("invoices").select("grand_total_paise, paid_paise, status");

  const rows = invoices ?? [];
  const totalBilled = rows.reduce((sum, r) => sum + (r.grand_total_paise ?? 0), 0);
  const totalPaid = rows.reduce((sum, r) => sum + (r.paid_paise ?? 0), 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <>
      <Kpi label="Total billed" value={formatInr(totalBilled)} />
      <Kpi label="Total received" value={formatInr(totalPaid)} />
      <Kpi label="Outstanding receivables" value={formatInr(outstanding)} />
    </>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: clientCount },
    { count: projectCount },
    { count: openTaskCount },
    { count: proposalCount },
    { data: recentActivity },
    { data: myTasks },
    { data: upcomingMeetings },
    { data: siteUpdates },
    { data: pendingDecisions },
    topPriorities,
    absences,
    readyToBill,
    awaitingPayment,
    approvals,
    clientRequests,
    consultantRequests,
    openTenders,
    contractorSubmissions,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("project_offices").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
    supabase.from("audit_log").select("id, entity, action, created_at").order("created_at", { ascending: false }).limit(8),
    user
      ? supabase
          .from("tasks")
          .select("id, title, due_date, priority, project_offices(title)")
          .eq("assignee_id", user.id)
          .neq("status", "DONE")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(6)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("moms")
      .select("id, title, meeting_date, venue, project_offices(title)")
      .gte("meeting_date", today)
      .order("meeting_date", { ascending: true })
      .limit(6),
    supabase
      .from("progress_reports")
      .select("id, period_start, period_end, physical_progress_pct, project_offices(title)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("decisions")
      .select("id, title, impact, review_deadline, project_id, project_offices(title)")
      .eq("state", "CLIENT_REVIEW")
      .order("review_deadline", { ascending: true, nullsFirst: false })
      .limit(6),
    getTopPriorities(supabase, today),
    getAbsencesToday(supabase, today),
    getReadyToBill(supabase),
    getAwaitingPayment(supabase, today),
    getApprovalsSummary(supabase, today),
    getOpenClientRequests(supabase),
    getOpenConsultantRequests(supabase),
    getOpenTenders(supabase),
    getOpenContractorSubmissions(supabase),
  ]);

  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const showFinancials = hasRank(profile?.role, 80);
  const openRequestCount = clientRequests.length + consultantRequests.length + openTenders.length;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Dashboard" description="What needs your attention today." />

        {/* Today's Brief — ESTI's grounded phraser, first thing on the
            page (2026-09-10 redesign). */}
        <TodaysBrief />

        {/* Top 3 Priorities — ranked across tasks/approvals/requests,
            see lib/dashboard/priority.ts for the scoring formula. */}
        <TopPriorities items={topPriorities} />

        {/* Headline numbers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <Kpi label="Clients" value={clientCount ?? 0} />
          <Kpi label="Projects" value={projectCount ?? 0} />
          <Kpi label="Open tasks" value={openTaskCount ?? 0} />
          <Kpi label="Proposals" value={proposalCount ?? 0} />
          <Kpi label="Absent today" value={absences.length} />
          <Kpi label="Open requests" value={openRequestCount} />
          {showFinancials && <Kpi label="Ready to bill" value={formatInr(readyToBill.total)} />}
          {showFinancials && <Kpi label="Awaiting payment" value={formatInr(awaitingPayment.total)} />}
          <FinancialSummary />
        </div>

        {/* What needs attention — the new widgets this redesign adds */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <DashboardWidget title="Team Availability Today">
            {absences.length === 0 ? (
              <EmptyRow text="Everyone's in — no one is on approved leave." />
            ) : (
              absences.map((a) => (
                <WidgetRow
                  key={a.id}
                  primary={a.teamMemberName}
                  secondary={`${a.type} · back ${a.toDate}`}
                />
              ))
            )}
          </DashboardWidget>

          {showFinancials && (
            <DashboardWidget title="Ready to Bill" viewAllHref="/invoices">
              {readyToBill.rows.length === 0 ? (
                <EmptyRow text="Nothing drafted right now." />
              ) : (
                readyToBill.rows.map((r) => (
                  <WidgetRow
                    key={r.id}
                    href={`/invoices/${r.id}`}
                    primary={r.ref}
                    secondary={r.projectTitle ?? "—"}
                    right={<span className="cds--type-body-01">{formatInr(r.netReceivablePaise)}</span>}
                  />
                ))
              )}
            </DashboardWidget>
          )}

          {showFinancials && (
            <DashboardWidget title="Awaiting Payment" viewAllHref="/invoices">
              {awaitingPayment.rows.length === 0 ? (
                <EmptyRow text="Nothing issued and unpaid right now." />
              ) : (
                awaitingPayment.rows.map((r) => (
                  <WidgetRow
                    key={r.id}
                    href={`/invoices/${r.id}`}
                    primary={r.ref}
                    secondary={r.projectTitle ?? "—"}
                    right={
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                        <span className="cds--type-body-01">{formatInr(r.outstandingPaise)}</span>
                        {r.daysSinceIssue !== null && (
                          <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                            {r.daysSinceIssue}d since issued
                          </span>
                        )}
                      </div>
                    }
                  />
                ))
              )}
            </DashboardWidget>
          )}

          <DashboardWidget title="Client Approvals" viewAllHref="/approvals">
            {approvals.pending.length === 0 ? (
              <EmptyRow text="Nothing awaiting client response." />
            ) : (
              approvals.pending.map((a) => (
                <WidgetRow
                  key={a.id}
                  primary={a.title}
                  secondary={a.projectTitle ?? "—"}
                  right={
                    <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                      sent {a.date ?? "—"}
                    </span>
                  }
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Client Requests">
            {clientRequests.length === 0 ? (
              <EmptyRow text="No open client requests." />
            ) : (
              clientRequests.map((r) => (
                <WidgetRow
                  key={r.id}
                  href={`/projects/${r.projectId}`}
                  primary={r.subject}
                  secondary={r.projectTitle ?? "—"}
                  right={
                    <Tag type={r.revisionCategory === "CRITICAL" ? "red" : "blue"} size="sm">
                      {REQUEST_KIND_LABEL[r.kind] ?? r.kind}
                    </Tag>
                  }
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Consultant Requests" viewAllHref="/consultants">
            {consultantRequests.length === 0 ? (
              <EmptyRow text="No open consultant requests." />
            ) : (
              consultantRequests.map((r) => (
                <WidgetRow
                  key={r.id}
                  primary={r.subject}
                  secondary={`${r.consultantName ?? "—"} · ${r.projectTitle ?? "—"}`}
                  right={
                    <Tag type="teal" size="sm">
                      {REQUEST_KIND_LABEL[r.kind] ?? r.kind}
                    </Tag>
                  }
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Open Tenders">
            {openTenders.length === 0 ? (
              <EmptyRow text="No tenders currently open." />
            ) : (
              openTenders.map((t) => (
                <WidgetRow
                  key={t.id}
                  primary={t.title}
                  secondary={`${t.projectTitle ?? "—"}${t.dueDate ? ` · due ${t.dueDate}` : ""}`}
                  right={
                    <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {t.bidCount}/{t.invitationCount} bid{t.invitationCount === 1 ? "" : "s"}
                    </span>
                  }
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Contractor Submissions">
            {contractorSubmissions.length === 0 ? (
              <EmptyRow text="No contractor submissions yet — this doesn't have a submit path built yet." />
            ) : (
              contractorSubmissions.map((c) => (
                <WidgetRow key={c.id} primary={c.subject} secondary={c.kind} />
              ))
            )}
          </DashboardWidget>
        </div>

        {/* Existing widgets, kept — repositioned below the new "what
            needs attention" section since the brief/priorities/headline
            numbers are now the page's actual lead. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <DashboardWidget title="My Tasks" viewAllHref="/tasks">
            {!user || (myTasks ?? []).length === 0 ? (
              <EmptyRow text="No open tasks assigned to you." />
            ) : (
              (myTasks ?? []).map((t) => {
                const project = Array.isArray(t.project_offices)
                  ? t.project_offices[0]
                  : (t.project_offices as { title: string } | null);
                const overdue = !!t.due_date && t.due_date < today;
                return (
                  <WidgetRow
                    key={t.id}
                    primary={t.title}
                    secondary={project?.title ?? "—"}
                    right={
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                        {t.due_date && (
                          <span
                            className="cds--type-helper-text-01"
                            style={{ color: overdue ? "var(--cds-support-error)" : "var(--cds-text-secondary)" }}
                          >
                            {overdue ? "Overdue " : "Due "}
                            {t.due_date}
                          </span>
                        )}
                        <Tag type={PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                          {t.priority}
                        </Tag>
                      </div>
                    }
                  />
                );
              })
            )}
          </DashboardWidget>

          <DashboardWidget title="Scheduled Meetings" viewAllHref="/moms">
            {(upcomingMeetings ?? []).length === 0 ? (
              <EmptyRow text="No meetings scheduled." />
            ) : (
              (upcomingMeetings ?? []).map((m) => {
                const project = Array.isArray(m.project_offices)
                  ? m.project_offices[0]
                  : (m.project_offices as { title: string } | null);
                return (
                  <WidgetRow
                    key={m.id}
                    href={`/moms/${m.id}`}
                    primary={m.title}
                    secondary={`${project?.title ?? "—"}${m.venue ? ` · ${m.venue}` : ""}`}
                    right={
                      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {m.meeting_date}
                      </span>
                    }
                  />
                );
              })
            )}
          </DashboardWidget>

          <DashboardWidget title="Site Updates" viewAllHref="/progress-reports">
            {(siteUpdates ?? []).length === 0 ? (
              <EmptyRow text="No progress reports yet." />
            ) : (
              (siteUpdates ?? []).map((r) => {
                const project = Array.isArray(r.project_offices)
                  ? r.project_offices[0]
                  : (r.project_offices as { title: string } | null);
                return (
                  <WidgetRow
                    key={r.id}
                    primary={project?.title ?? "—"}
                    secondary={`${r.period_start} – ${r.period_end}`}
                    right={
                      r.physical_progress_pct != null ? (
                        <Tag type="blue" size="sm">
                          {r.physical_progress_pct}% built
                        </Tag>
                      ) : undefined
                    }
                  />
                );
              })
            )}
          </DashboardWidget>

          <DashboardWidget title="Decisions Awaiting Client">
            {(pendingDecisions ?? []).length === 0 ? (
              <EmptyRow text="No decisions awaiting client response." />
            ) : (
              (pendingDecisions ?? []).map((d) => {
                const project = Array.isArray(d.project_offices)
                  ? d.project_offices[0]
                  : (d.project_offices as { title: string } | null);
                return (
                  <WidgetRow
                    key={d.id}
                    href={`/projects/${d.project_id}/decisions`}
                    primary={d.title}
                    secondary={
                      d.review_deadline ? `${project?.title ?? "—"} · due ${d.review_deadline}` : project?.title ?? "—"
                    }
                    right={
                      <Tag type={IMPACT_TAG[d.impact] ?? "gray"} size="sm">
                        {d.impact}
                      </Tag>
                    }
                  />
                );
              })
            )}
          </DashboardWidget>
        </div>

        <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
          Recent activity
        </h2>
        <Tile>
          {(recentActivity ?? []).length === 0 ? (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No activity yet.
            </p>
          ) : (
            (recentActivity ?? []).map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                }}
              >
                <span className="cds--type-body-01">
                  <Tag type="blue" size="sm">
                    {a.action}
                  </Tag>{" "}
                  {a.entity}
                </span>
                <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            ))
          )}
        </Tile>
      </Column>
    </Grid>
  );
}
