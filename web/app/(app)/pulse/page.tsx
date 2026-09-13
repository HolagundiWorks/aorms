import { Grid, Column, Tile, Tag } from "@carbon/react";
import {
  WarningFilled,
  LockedAndBlocked,
  Query,
  ChartLineData,
  CurrencyRupee,
  Wallet,
  User,
  ListChecked,
  UserMultiple,
  FolderDetails,
  DocumentRequirements,
  Chat,
} from "@carbon/icons-react";
import { createClient } from "../../../lib/supabase/server";
import { hasRank } from "../../../lib/auth/rank";
import { KpiTile as Kpi, type KpiStatus } from "../../../components/aorms/KpiTile";
import { getKpiTrends } from "../../../lib/pulse/kpi-trend";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { DashboardWidget, EmptyRow, WidgetRow, MASONRY_PANEL_STYLE } from "../../../components/aorms/dashboard/DashboardWidget";
import { TodaysBrief } from "../../../components/aorms/dashboard/TodaysBrief";
import { ActionQueue } from "../../../components/aorms/dashboard/ActionQueue";
import { DashboardTabs } from "../../../components/aorms/dashboard/DashboardTabs";
import { KpiTabs } from "../../../components/aorms/dashboard/KpiTabs";
import { RecomputeButton } from "../../../components/aorms/pulse/RecomputeButton";
import { MissingParamActions } from "../../../components/aorms/pulse/MissingParamActions";
import { AskPulseForm } from "../../../components/aorms/pulse/AskPulseForm";
import { PRIORITY_BAND_LABEL, type PriorityBand } from "../../../lib/pulse/scoring";
import { getTopPriorities } from "../../../lib/dashboard/priority";
import { getTopPriorityTasks, getLowConfidenceTasks, getBlockedTasks, getOpenMissingParams } from "../../../lib/pulse/queries";
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

/**
 * Pulse — the AORMS home/dashboard (2026-09-14 remediation, per the
 * attached IA brief §4: "Pulse is the AORMS dashboard. There must not be
 * a separate generic Dashboard nav item if Pulse already serves that
 * purpose"). This page is the merge of what were two separate screens:
 *
 *   - the former /dashboard (Today's Brief, Action Queue, tabbed KPIs,
 *     tabbed widget registers, activity feed — built 2026-09-10 through
 *     2026-09-13)
 *   - the former /pulse (ESTI's deterministic task-prediction engine —
 *     Top priorities/Blocked tasks/Missing parameters/Low confidence
 *     tasks + the Ask Pulse NL box — built 2026-09-12)
 *
 * Nothing from either screen was dropped — Pulse's own 4 KPIs became a
 * 4th KpiTabs panel, its 4 widgets + Ask Pulse became a new "Task
 * Prediction" DashboardTabs panel, and the old Dashboard's "Low
 * Confidence Tasks" widget (in My Work) was removed as a now-redundant
 * duplicate of the one properly homed in Task Prediction rather than
 * showing the same list under two tab labels. /dashboard itself now
 * redirects here (see that route's own file) — old links/bookmarks
 * still work, per the brief's own §32 routing rule ("introduce the new
 * route, redirect the old one, don't delete blindly").
 */

const BAND_TAG: Record<PriorityBand, "red" | "magenta" | "purple" | "blue" | "gray"> = {
  CRITICAL: "red",
  ACTION_TODAY: "magenta",
  WATCH: "purple",
  NORMAL: "blue",
  BACKLOG: "gray",
};

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

export default async function PulsePage() {
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
    pulsePriorities,
    blockedTasks,
    missingParams,
    { data: projects },
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
    getTopPriorityTasks(supabase),
    getBlockedTasks(supabase),
    getOpenMissingParams(supabase),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const showFinancials = hasRank(profile?.role, 80);
  const openRequestCount = clientRequests.length + consultantRequests.length + openTenders.length;
  const criticalPulseCount = pulsePriorities.filter((t) => t.band === "CRITICAL").length;

  const absentStatus = countStatus(absences.length, 1, 2);
  const openRequestStatus = countStatus(openRequestCount, 1, 4);
  const oldestUnpaidDays = awaitingPayment.rows.reduce((max, r) => Math.max(max, r.daysSinceIssue ?? 0), 0);
  const awaitingPaymentStatus = countStatus(oldestUnpaidDays, 15, 31);

  const financePanel = showFinancials ? (
    <div style={MASONRY_PANEL_STYLE}>
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
    <div style={MASONRY_PANEL_STYLE}>
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
    <div style={MASONRY_PANEL_STYLE}>
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
    <div style={MASONRY_PANEL_STYLE}>
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
    </div>
  );

  // Task Prediction — ESTI Pulse's own deterministic scoring (see
  // lib/pulse/scoring.ts and lib/pulse/recompute.ts's own header comment
  // for what this deliberately does NOT yet cover: Module 3's Standup
  // Agent, Module 4's full question-routing loop — both need a
  // notifications system this app doesn't have).
  const taskPredictionPanel = (
    <>
      <div style={{ ...MASONRY_PANEL_STYLE, columnWidth: "22rem", columnGap: "1.5rem", marginBottom: "1.5rem" }}>
        <DashboardWidget title="Top priorities">
          {pulsePriorities.length === 0 ? (
            <EmptyRow text="No open tasks scored yet — run Recompute now." />
          ) : (
            pulsePriorities.map((t) => (
              <WidgetRow
                key={t.id}
                primary={t.title}
                secondary={t.projectTitle ?? undefined}
                right={
                  <Tag type={BAND_TAG[t.band]} size="sm">
                    {PRIORITY_BAND_LABEL[t.band]}
                  </Tag>
                }
              />
            ))
          )}
        </DashboardWidget>

        <DashboardWidget title="Blocked tasks">
          {blockedTasks.length === 0 ? (
            <EmptyRow text="Nothing is blocked on an open dependency right now." />
          ) : (
            blockedTasks.map((b) => <WidgetRow key={b.dependencyId} primary={b.taskTitle} secondary={`Blocked by: ${b.dependsOnTitle}`} />)
          )}
        </DashboardWidget>

        <DashboardWidget title="Missing parameters">
          {missingParams.length === 0 ? (
            <EmptyRow text="No open gaps — every task has its due date, assignee, and dependencies in order." />
          ) : (
            missingParams.map((p) => (
              <WidgetRow
                key={p.id}
                primary={p.taskTitle}
                secondary={`${p.description}${p.assigneeName ? ` — ${p.assigneeName}` : " — Unassigned"}`}
                right={<MissingParamActions paramId={p.id} />}
              />
            ))
          )}
        </DashboardWidget>

        <DashboardWidget title="Low confidence tasks">
          {lowConfidenceTasks.length === 0 ? (
            <EmptyRow text="Nothing is flagged low-confidence right now." />
          ) : (
            lowConfidenceTasks.map((t) => (
              <WidgetRow key={t.id} primary={t.title} secondary={t.projectTitle ?? undefined} right={`${t.confidenceScore}%`} />
            ))
          )}
        </DashboardWidget>
      </div>

      <div style={{ maxWidth: "36rem" }}>
        <DashboardWidget title="Ask Pulse">
          <AskPulseForm projects={projects ?? []} />
        </DashboardWidget>
      </div>
    </>
  );

  // Real movement vs stored history (2026-09-14, shell/identity/KPI spec
  // §21-22, migration 0045) — undefined for any metric with no prior
  // snapshot yet (a fresh metric, or before the daily cron has run even
  // once); KpiTile just omits the trend row in that case rather than
  // showing a fabricated "0% change." See lib/pulse/kpi-trend.ts.
  const kpiTrends = await getKpiTrends(supabase, today, [
    { key: "pulse_critical", current: criticalPulseCount, higherIsBetter: false },
    { key: "pulse_blocked_tasks", current: blockedTasks.length, higherIsBetter: false },
    { key: "pulse_open_gaps", current: missingParams.length, higherIsBetter: false },
    { key: "pulse_low_confidence", current: lowConfidenceTasks.length, higherIsBetter: false },
    { key: "finance_ready_to_bill", current: readyToBill.total, higherIsBetter: true, isMoney: true },
    { key: "finance_awaiting_payment", current: awaitingPayment.total, higherIsBetter: false, isMoney: true },
    { key: "team_absent_today", current: absences.length, higherIsBetter: false },
    { key: "team_open_tasks", current: openTaskCount ?? 0, higherIsBetter: null },
    { key: "others_clients", current: clientCount ?? 0, higherIsBetter: true },
    { key: "others_projects", current: projectCount ?? 0, higherIsBetter: true },
    { key: "others_proposals", current: proposalCount ?? 0, higherIsBetter: true },
    { key: "others_open_requests", current: openRequestCount, higherIsBetter: false },
  ]);

  const pulseKpis = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9.5rem)", gap: "1rem" }}>
      <Kpi
        label="Critical"
        value={criticalPulseCount}
        status={criticalPulseCount > 0 ? "CRITICAL" : "NORMAL"}
        icon={WarningFilled}
        trend={kpiTrends.pulse_critical}
      />
      <Kpi label="Blocked tasks" value={blockedTasks.length} icon={LockedAndBlocked} trend={kpiTrends.pulse_blocked_tasks} />
      <Kpi label="Open gaps" value={missingParams.length} icon={Query} trend={kpiTrends.pulse_open_gaps} />
      <Kpi label="Low confidence" value={lowConfidenceTasks.length} icon={ChartLineData} trend={kpiTrends.pulse_low_confidence} />
    </div>
  );

  const financeKpis = showFinancials ? (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9.5rem)", gap: "1rem" }}>
      <Kpi label="Ready to bill" value={formatInr(readyToBill.total)} icon={CurrencyRupee} trend={kpiTrends.finance_ready_to_bill} />
      <Kpi
        label="Awaiting payment"
        value={formatInr(awaitingPayment.total)}
        status={awaitingPaymentStatus}
        icon={Wallet}
        trend={kpiTrends.finance_awaiting_payment}
      />
      <FinancialSummary />
    </div>
  ) : null;

  const teamKpis = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9.5rem)", gap: "1rem" }}>
      <Kpi label="Absent today" value={absences.length} status={absentStatus} icon={User} trend={kpiTrends.team_absent_today} />
      <Kpi label="Open tasks" value={openTaskCount ?? 0} icon={ListChecked} trend={kpiTrends.team_open_tasks} />
    </div>
  );

  const othersKpis = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9.5rem)", gap: "1rem" }}>
      <Kpi label="Clients" value={clientCount ?? 0} icon={UserMultiple} trend={kpiTrends.others_clients} />
      <Kpi label="Projects" value={projectCount ?? 0} icon={FolderDetails} trend={kpiTrends.others_projects} />
      <Kpi label="Proposals" value={proposalCount ?? 0} icon={DocumentRequirements} trend={kpiTrends.others_proposals} />
      <Kpi
        label="Open requests"
        value={openRequestCount}
        status={openRequestStatus}
        icon={Chat}
        trend={kpiTrends.others_open_requests}
      />
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
        <PageHeader
          title="Pulse"
          description="What needs your attention today — office KPIs, pending approvals, and ESTI's deterministic task-prediction scoring, all computed from real project data."
          actions={<RecomputeButton />}
        />

        {/* Today's Brief + Action Queue, as two separate Tiles side by
            side (2026-09-14 UI-polish request; briefly one merged Tile,
            reverted same day — nesting Carbon's Grid inside a Tile
            cancelled the Tile's own padding, see TodaysBrief.tsx's
            header comment). Grid/Column wraps *around* each Tile here,
            not inside it, so both Tiles keep their normal padding. ~1/3
            for the brief (lg={5}), ~2/3 for the ranked "Next up" queue
            (lg={11}) — the page's actual "what to do next," not just a
            highlight reel (see ActionQueue.tsx/QueueActions.tsx). */}
        <Grid narrow style={{ marginBottom: "1rem" }}>
          <Column sm={4} md={8} lg={5} style={{ marginBottom: "1rem" }}>
            <TodaysBrief />
          </Column>
          <Column sm={4} md={8} lg={11} style={{ marginBottom: "1rem" }}>
            <ActionQueue items={topPriorities} />
          </Column>
        </Grid>

        {/* KPI tabs — Pulse / Finance / Team / Others. Three tiles carry a
            green/amber/red health status (KpiTile.tsx's `status` prop);
            the rest stay plain counts — see that file's own comment for
            why not every KPI gets one. */}
        <div style={{ marginBottom: "1rem" }}>
          <KpiTabs pulse={pulseKpis} finance={financeKpis} team={teamKpis} others={othersKpis} />
        </div>

        {/* Everything else — organized into switchable tabs (see
            DashboardTabs.tsx's own header comment for the grouping
            rationale, and its PANEL_SCROLL_STYLE for why each tab scrolls
            within itself rather than growing the page). */}
        <DashboardTabs
          taskPrediction={taskPredictionPanel}
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
