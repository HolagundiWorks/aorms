import { Grid, Column, Tile, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { hasRank } from "../../../lib/auth/rank";
import { KpiTile as Kpi, type KpiStatus } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { DashboardWidget, EmptyRow, WidgetRow } from "../../../components/aorms/dashboard/DashboardWidget";
import { TodaysBrief } from "../../../components/aorms/dashboard/TodaysBrief";
import { ActionQueue } from "../../../components/aorms/dashboard/ActionQueue";
import { DashboardTabs } from "../../../components/aorms/dashboard/DashboardTabs";
import { KpiTabs } from "../../../components/aorms/dashboard/KpiTabs";
import { getTopPriorities } from "../../../lib/dashboard/priority";
import { getLowConfidenceTasks } from "../../../lib/pulse/queries";
import {
  getAbsencesToday,
  getApprovalsSummary,
  getAwaitingPayment,
  getOpenClientRequests,
  getOpenConsultantRequests,
  getOpenContractorSubmissions,
  getOpenTenders,
  getPendingClientReviewDecisions,
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
 * Per-metric KPI health thresholds (2026-09-13) — deliberately simple,
 * documented tiers rather than a tuned/ML score, matching this app's
 * existing "no black box" scoring discipline (see lib/dashboard/
 * priority.ts's own header comment). Only applied to metrics with a real
 * bad direction — see KpiTile.tsx's own comment for which ones don't get
 * a status at all.
 */
function countStatus(count: number, intervention: number, critical: number): KpiStatus {
  if (count >= critical) return "CRITICAL";
  if (count >= intervention) return "NEEDS_INTERVENTION";
  return "NORMAL";
}

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
  // Ratio, not the raw rupee amount — a bigger firm always has a bigger
  // outstanding number, so only "how much of everything billed is still
  // unpaid" is a meaningful health signal. <15% normal / <35% needs
  // intervention / else critical; nothing billed yet reads as normal
  // (there's nothing to be behind on).
  const outstandingPct = totalBilled > 0 ? outstanding / totalBilled : 0;
  const outstandingStatus: KpiStatus = outstandingPct >= 0.35 ? "CRITICAL" : outstandingPct >= 0.15 ? "NEEDS_INTERVENTION" : "NORMAL";

  return (
    <>
      <Kpi label="Total billed" value={formatInr(totalBilled)} />
      <Kpi label="Total received" value={formatInr(totalPaid)} />
      <Kpi label="Outstanding receivables" value={formatInr(outstanding)} status={outstandingStatus} />
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
    pendingDecisions,
    topPriorities,
    absences,
    readyToBill,
    awaitingPayment,
    approvals,
    clientRequests,
    consultantRequests,
    openTenders,
    contractorSubmissions,
    lowConfidenceTasks,
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
    getPendingClientReviewDecisions(supabase),
    getTopPriorities(supabase, today, 8),
    getAbsencesToday(supabase, today),
    getReadyToBill(supabase),
    getAwaitingPayment(supabase, today),
    getApprovalsSummary(supabase, today),
    getOpenClientRequests(supabase),
    getOpenConsultantRequests(supabase),
    getOpenTenders(supabase),
    getOpenContractorSubmissions(supabase),
    getLowConfidenceTasks(supabase),
  ]);

  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const showFinancials = hasRank(profile?.role, 80);
  const openRequestCount = clientRequests.length + consultantRequests.length + openTenders.length;

  // Absent today / Open requests — small-firm-appropriate tiers (this
  // studio's own demo roster is 5 people); Awaiting payment — the oldest
  // unpaid invoice's own age, not the bucket's rupee total (a big studio
  // always has a bigger number outstanding, but a 45-day-old unpaid
  // invoice is a real problem at any size).
  const absentStatus = countStatus(absences.length, 1, 2);
  const openRequestStatus = countStatus(openRequestCount, 1, 4);
  const oldestUnpaidDays = awaitingPayment.rows.reduce((max, r) => Math.max(max, r.daysSinceIssue ?? 0), 0);
  const awaitingPaymentStatus = countStatus(oldestUnpaidDays, 15, 31);

  const financePanel = showFinancials ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
        gap: "1rem",
        alignItems: "start",
      }}
    >
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
    </div>
  ) : null;

  const teamAndSitePanel = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      <DashboardWidget title="Team Availability Today">
        {absences.length === 0 ? (
          <EmptyRow text="Everyone's in — no one is on approved leave." />
        ) : (
          absences.map((a) => <WidgetRow key={a.id} primary={a.teamMemberName} secondary={`${a.type} · back ${a.toDate}`} />)
        )}
      </DashboardWidget>

      <DashboardWidget title="Site Updates" viewAllHref="/progress-reports">
        {(siteUpdates ?? []).length === 0 ? (
          <EmptyRow text="No progress reports yet." />
        ) : (
          (siteUpdates ?? []).map((r) => {
            const project = Array.isArray(r.project_offices) ? r.project_offices[0] : (r.project_offices as { title: string } | null);
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

      <DashboardWidget title="Scheduled Meetings" viewAllHref="/moms">
        {(upcomingMeetings ?? []).length === 0 ? (
          <EmptyRow text="No meetings scheduled." />
        ) : (
          (upcomingMeetings ?? []).map((m) => {
            const project = Array.isArray(m.project_offices) ? m.project_offices[0] : (m.project_offices as { title: string } | null);
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

      <DashboardWidget title="Contractor Submissions">
        {contractorSubmissions.length === 0 ? (
          <EmptyRow text="No contractor submissions yet — this doesn't have a submit path built yet." />
        ) : (
          contractorSubmissions.map((c) => <WidgetRow key={c.id} primary={c.subject} secondary={c.kind} />)
        )}
      </DashboardWidget>
    </div>
  );

  const pipelineAndPartnersPanel = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
        gap: "1rem",
        alignItems: "start",
      }}
    >
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

      <DashboardWidget title="Decisions Awaiting Client">
        {pendingDecisions.length === 0 ? (
          <EmptyRow text="No decisions awaiting client response." />
        ) : (
          pendingDecisions.map((d) => (
            <WidgetRow
              key={d.id}
              href={`/projects/${d.projectId}/decisions`}
              primary={d.title}
              secondary={d.reviewDeadline ? `${d.projectTitle ?? "—"} · due ${d.reviewDeadline}` : (d.projectTitle ?? "—")}
              right={
                <Tag type={IMPACT_TAG[d.impact] ?? "gray"} size="sm">
                  {d.impact}
                </Tag>
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
    </div>
  );

  const myWorkPanel = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      <DashboardWidget title="My Tasks" viewAllHref="/tasks">
        {!user || (myTasks ?? []).length === 0 ? (
          <EmptyRow text="No open tasks assigned to you." />
        ) : (
          (myTasks ?? []).map((t) => {
            const project = Array.isArray(t.project_offices) ? t.project_offices[0] : (t.project_offices as { title: string } | null);
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

      {/* ESTI Pulse (2026-09-12) — deterministic confidence scoring, see
          lib/pulse/scoring.ts. Links to /pulse for the full Priority/
          Blocked/Missing-parameter picture. */}
      <DashboardWidget title="Low Confidence Tasks" viewAllHref="/pulse">
        {lowConfidenceTasks.length === 0 ? (
          <EmptyRow text="Nothing flagged low-confidence right now." />
        ) : (
          lowConfidenceTasks.map((t) => (
            <WidgetRow
              key={t.id}
              href="/pulse"
              primary={t.title}
              secondary={t.projectTitle ?? "—"}
              right={
                <span className="cds--type-helper-text-01" style={{ color: "var(--cds-support-warning)" }}>
                  {t.confidenceScore}% confidence
                </span>
              }
            />
          ))
        )}
      </DashboardWidget>
    </div>
  );

  // KPI groups (2026-09-13 "single screen" restructure) — a flat 9-tile
  // grid used to run 2-3 rows deep; grouping into KpiTabs.tsx's Finance/
  // Team/Others panels gets it down to one row's worth of vertical space
  // at a time, the same "show one group, not everything at once" idea
  // DashboardTabs.tsx already applies to the widget registers below.
  const financeKpis = showFinancials ? (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))", gap: "1rem" }}>
      <Kpi label="Ready to bill" value={formatInr(readyToBill.total)} />
      <Kpi label="Awaiting payment" value={formatInr(awaitingPayment.total)} status={awaitingPaymentStatus} />
      <FinancialSummary />
    </div>
  ) : null;

  const teamKpis = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))", gap: "1rem" }}>
      <Kpi label="Absent today" value={absences.length} status={absentStatus} />
      <Kpi label="Open tasks" value={openTaskCount ?? 0} />
    </div>
  );

  const othersKpis = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))", gap: "1rem" }}>
      <Kpi label="Clients" value={clientCount ?? 0} />
      <Kpi label="Projects" value={projectCount ?? 0} />
      <Kpi label="Proposals" value={proposalCount ?? 0} />
      <Kpi label="Open requests" value={openRequestCount} status={openRequestStatus} />
    </div>
  );

  const activityPanel = (
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
  );

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Dashboard" description="What needs your attention today." />

        {/* Today's Brief — ESTI's grounded phraser, first thing on the
            page (2026-09-10 redesign). */}
        <TodaysBrief />

        {/* Action Queue — replaces the old view-only "Top 3 Priorities"
            card grid (2026-09-13 restructure): same ranked pool from
            lib/dashboard/priority.ts, now also pooling in decisions
            awaiting client review, shown 8-deep instead of 3, and with a
            real one-click resolution inline wherever one honestly exists
            (see ActionQueue.tsx/QueueActions.tsx). This is the page's
            actual "what to do next," not just a highlight reel. */}
        <ActionQueue items={topPriorities} />

        {/* KPI tabs — Finance / Team / Others, replacing the old flat
            multi-row grid (see KpiTabs.tsx). Three of these tiles carry a
            green/amber/red health status (KpiTile.tsx's `status` prop);
            the rest stay plain counts, deliberately — see that file's own
            comment for why not every KPI gets one. */}
        <div style={{ marginBottom: "1rem" }}>
          <KpiTabs finance={financeKpis} team={teamKpis} others={othersKpis} />
        </div>

        {/* Everything else — organized into switchable tabs instead of
            two long flat grids of 9 and 4 always-visible tiles plus a
            separate always-visible activity feed (2026-09-13 restructure;
            see DashboardTabs.tsx's own header comment for the grouping
            rationale, and its PANEL_SCROLL_STYLE for why each tab scrolls
            within itself rather than growing the page). Nothing here was
            removed, just regrouped by who'd reach for it. */}
        <DashboardTabs
          finance={financePanel}
          teamAndSite={teamAndSitePanel}
          pipelineAndPartners={pipelineAndPartnersPanel}
          myWork={myWorkPanel}
          activity={activityPanel}
        />
      </Column>
    </Grid>
  );
}
