import { Building, Certificate, Chat, CurrencyRupee, UserMultiple } from "@carbon/icons-react";
import NextLink from "next/link";
import { Column, Grid, Stack } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { AdminAccessDenied } from "../../../components/aorms/platform/AdminAccessDenied";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

/**
 * AORMS Platform admin back office — dashboard. Gated behind platform
 * staff status (any role, SUPER_ADMIN or SUPPORT_STAFF) — originally
 * `accounts.is_admin`, settable only via direct DB access (migration
 * 0016); as of 2026-09-14's Identity/Admin separation, that's
 * `public.platform_staff` instead (platform migrations 0022-0023), with
 * a real self-service grant/revoke UI now (SUPER_ADMIN-only —
 * /admin/accounts's AccountAdminControls.tsx) rather than "requires
 * direct DB access" being the only path. This page's own gate
 * (`account?.is_admin` below) reads the derived field
 * `getCurrentPlatformSessionAccount()` resolves from that table, not a
 * raw column, so it needed no change when the underlying table did. The
 * full platform-wide KPIs/payments/activity below are SUPER_ADMIN
 * only — support staff get a smaller, HelpDeX-focused view instead of
 * dead-end links into pages they can't open. Every count below is a
 * cheap `head: true` row count, not a full row fetch — same KPI-strip
 * pattern used throughout app/(app)/*.
 */
export default async function AdminDashboardPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Admin" />;

  const platformService = createPlatformServiceRoleClient();

  if (!isSuperAdmin(account)) {
    const { count: openTicketCount } = await platformService
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["OPEN", "IN_PROGRESS"]);

    return (
      <>
        <SysDexPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader title="Admin" description="SysDeX — support staff view." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 11rem)", gap: "1rem", marginBottom: "2rem" }}>
              <KpiTile label="Open HelpDeX tickets" value={openTicketCount ?? 0} icon={Chat} />
            </div>
            <NextLink href="/admin/helpdesk" className="cds--type-body-01">
              Go to HelpDeX →
            </NextLink>
          </Column>
        </Grid>
      </>
    );
  }

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

  // 2026-09-15 fix — this object was still keyed on the pre-2026-09-14
  // plan names (TRIAL/PRO/ENTERPRISE), renamed to FREE/STUDIO/
  // PROFESSIONAL/ENTERPRISE by platform migration 0033. Every real
  // licence has been on the new names since that migration, so
  // "Trial licences" always read 0, and "Paid licences" (PRO+ENTERPRISE)
  // silently excluded every STUDIO and PROFESSIONAL licence — both
  // Supabase clients here have no generated Database type, so `l.plan`
  // is untyped `string` and neither tsc nor eslint could catch the
  // stale key mismatch.
  const planCounts = { FREE: 0, STUDIO: 0, PROFESSIONAL: 0, ENTERPRISE: 0 };
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
            gridTemplateColumns: "repeat(auto-fill, 11rem)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Studios" value={studioCount ?? 0} icon={Building} />
          <KpiTile label="Accounts" value={accountCount ?? 0} icon={UserMultiple} />
          <KpiTile label="Free licences" value={planCounts.FREE} icon={Certificate} />
          <KpiTile
            label="Paid licences"
            value={planCounts.STUDIO + planCounts.PROFESSIONAL + planCounts.ENTERPRISE}
            icon={CurrencyRupee}
          />
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
