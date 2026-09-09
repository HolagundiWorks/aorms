import Link from "next/link";
import { Grid, Column, Tile, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { KpiTile as Kpi } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

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
  const rank: Record<string, number> = {
    OWNER: 100,
    PARTNER: 80,
    ACCOUNTANT: 80,
    HR_MANAGER: 80,
    SENIOR: 60,
    ASSOCIATE: 40,
    VIEWER: 20,
  };
  const hasInvoiceManage = (rank[profile?.role ?? ""] ?? 0) >= 80;
  if (!hasInvoiceManage) return null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("grand_total_paise, paid_paise, status");

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

/** One "office-wide snapshot" list widget — a Tile with a Section heading,
 * an optional "View all" link to the record's own full register page, and
 * up to a handful of WidgetRow entries. Kept as one shared shell (matching
 * KpiTile/PageHeader's own extract-don't-repeat precedent) since all four
 * widgets below share the identical title-bar + empty-state + row shape. */
function DashboardWidget({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Tile>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h2 className="cds--type-heading-02">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="cds--type-body-01">
            View all
          </Link>
        )}
      </div>
      {children}
    </Tile>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
      {text}
    </p>
  );
}

function WidgetRow({
  href,
  primary,
  secondary,
  right,
}: {
  href?: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const row = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid var(--cds-border-subtle)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p className="cds--type-body-01" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {primary}
        </p>
        {secondary && (
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            {secondary}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0, textAlign: "right" }}>{right}</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
      {row}
    </Link>
  ) : (
    row
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
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("project_offices").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
    supabase
      .from("audit_log")
      .select("id, entity, action, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    // My Tasks — open tasks assigned to the signed-in user, soonest due
    // first (nulls — no due date set — pushed to the end, not the front).
    user
      ? supabase
          .from("tasks")
          .select("id, title, due_date, priority, project_offices(title)")
          .eq("assignee_id", user.id)
          .neq("status", "DONE")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(6)
      : Promise.resolve({ data: [] as never[] }),
    // Scheduled Meetings — moms is "minutes of meeting" (a record of what
    // was discussed), but meeting_date carries no constraint against being
    // in the future, so a MoM logged ahead of time doubles as the
    // schedule entry for that meeting — no separate calendar/events table
    // exists in this schema to build a truer "upcoming meetings" feature
    // against.
    supabase
      .from("moms")
      .select("id, title, meeting_date, venue, project_offices(title)")
      .gte("meeting_date", today)
      .order("meeting_date", { ascending: true })
      .limit(6),
    // Site Updates — most recently logged progress_reports across every
    // project, newest first (the closest real "site update" concept this
    // schema has: period narrative + physical/schedule progress %).
    supabase
      .from("progress_reports")
      .select("id, period_start, period_end, physical_progress_pct, project_offices(title)")
      .order("created_at", { ascending: false })
      .limit(6),
    // Decisions Awaiting Client — CRIF decisions currently sent to the
    // client portal for response, soonest review_deadline first.
    supabase
      .from("decisions")
      .select("id, title, impact, review_deadline, project_id, project_offices(title)")
      .eq("state", "CLIENT_REVIEW")
      .order("review_deadline", { ascending: true, nullsFirst: false })
      .limit(6),
  ]);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Dashboard" description="Office-wide snapshot." />

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
          <FinancialSummary />
        </div>

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
