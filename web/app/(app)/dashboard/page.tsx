import { Grid, Column, Tile, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Tile style={{ minHeight: "6rem" }}>
      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
        {label}
      </p>
      <p className="cds--type-heading-04" style={{ marginTop: "0.5rem" }}>
        {value}
      </p>
    </Tile>
  );
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: clientCount },
    { count: projectCount },
    { count: openTaskCount },
    { count: proposalCount },
    { data: recentActivity },
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
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Dashboard</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Office-wide snapshot.
        </p>

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

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
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
