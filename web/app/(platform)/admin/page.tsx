import NextLink from "next/link";
import { Column, Grid, Stack } from "@carbon/react";
import { getCurrentPlatformSessionAccount } from "../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { AdminAccessDenied } from "../../../components/aorms/platform/AdminAccessDenied";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

/**
 * AORMS Platform admin back office — dashboard. Gated behind
 * accounts.is_admin (platform/supabase/migrations/0009_admin_role.sql), a
 * column settable only via direct DB access, no self-service grant UI in
 * this pass (see docs/esti/ROADMAP-CLOUD.md's dated entry for the full
 * design). Every count below is a cheap `head: true` row count, not a full
 * row fetch — same KPI-strip pattern used throughout app/(app)/*.
 */
export default async function AdminDashboardPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Admin" />;

  const platformService = createPlatformServiceRoleClient();
  const [{ count: studioCount }, { count: accountCount }, { data: licences }, { data: recentPayments }, { data: recentActivity }] =
    await Promise.all([
      platformService.from("studios").select("id", { count: "exact", head: true }),
      platformService.from("accounts").select("id", { count: "exact", head: true }),
      platformService.from("licences").select("plan"),
      platformService
        .from("payments")
        .select("id, plan, amount_paise, status, created_at, studios(name)")
        .order("created_at", { ascending: false })
        .limit(5),
      platformService.from("platform_activity_log").select("id, event_type, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

  const planCounts = { TRIAL: 0, STANDARD: 0, PREMIUM: 0 };
  for (const l of licences ?? []) {
    if (l.plan in planCounts) planCounts[l.plan as keyof typeof planCounts]++;
  }

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Admin" description="AORMS Platform back office — licences, payments, and activity across every studio." />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Studios" value={studioCount ?? 0} />
          <KpiTile label="Accounts" value={accountCount ?? 0} />
          <KpiTile label="Trial licences" value={planCounts.TRIAL} />
          <KpiTile label="Paid licences" value={planCounts.STANDARD + planCounts.PREMIUM} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))", gap: "1.5rem" }}>
          <Stack gap={3}>
            <h2 className="cds--type-heading-02">Recent payments</h2>
            {(recentPayments ?? []).length === 0 ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No payments yet.
              </p>
            ) : (
              (recentPayments ?? []).map((p) => {
                const studio = (Array.isArray(p.studios) ? p.studios[0] : p.studios) as { name: string } | null;
                return (
                  <p key={p.id} className="cds--type-body-01">
                    {studio?.name ?? "—"} · {p.plan} · ₹{(p.amount_paise / 100).toLocaleString("en-IN")} · {p.status}
                  </p>
                );
              })
            )}
            <NextLink href="/admin/payments" className="cds--type-body-01">
              View all payments →
            </NextLink>
          </Stack>
          <Stack gap={3}>
            <h2 className="cds--type-heading-02">Recent activity</h2>
            {(recentActivity ?? []).length === 0 ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No activity logged yet.
              </p>
            ) : (
              (recentActivity ?? []).map((a) => (
                <p key={a.id} className="cds--type-body-01">
                  {a.event_type} · {new Date(a.created_at).toLocaleString()}
                </p>
              ))
            )}
            <NextLink href="/admin/logs" className="cds--type-body-01">
              View full log →
            </NextLink>
          </Stack>
        </div>
      </Column>
    </Grid>
    </>
  );
}
