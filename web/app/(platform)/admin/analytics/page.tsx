import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { BigStat } from "../../../../components/aorms/BigStat";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

/**
 * SysDeX analytics (2026-10-01, roadmap P2). Everything here is a count or sum of
 * rows that exist — no modelled MRR/churn (licences are one-time annual orders, so
 * "revenue" means captured payments, not a recurring figure). Month buckets are
 * UTC and cover the last 12 months.
 */
export default async function AdminAnalyticsPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Analytics" />;

  const svc = createPlatformServiceRoleClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  since.setUTCHours(0, 0, 0, 0);

  // All aggregation happens in SQL (platform migration 0052, `public.admin_analytics`) — one
  // round trip returning counts/sums instead of whole tables pulled into Node.
  type Tally = { k: string; n: number }[];
  type Analytics = {
    studios: number;
    accounts: number;
    quotes: number;
    plan_mix: Tally;
    app_funnel: Tally;
    company_status: Tally;
    tier_mix: Tally;
    revenue: { m: string; src: "licence" | "identity" | "connectdex"; paise: number }[];
    ticket_age: { lt1: number; d1_3: number; d3_7: number; gt7: number };
  };
  const { data, error } = await svc.rpc("admin_analytics", { p_since: since.toISOString() });
  if (error) throw new Error(error.message);
  const a = data as Analytics;
  const { studios, accounts, quotes } = a;
  const toRows = (t: Tally): [string, number][] => t.map((r) => [r.k, Number(r.n)]);
  const planMix = toRows(a.plan_mix);
  const appFunnel = toRows(a.app_funnel);
  const companyStatus = toRows(a.company_status);
  const tierMix = toRows(a.tier_mix);

  // Revenue by month (captured payments across Studio licences, Identity and ConnectDeX fees).
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const rev = new Map(months.map((m) => [m, { licence: 0, identity: 0, connectdex: 0 }]));
  for (const r of a.revenue) {
    const bucket = rev.get(r.m);
    if (bucket) bucket[r.src] += Number(r.paise);
  }
  const total12 = [...rev.values()].reduce((s, b) => s + b.licence + b.identity + b.connectdex, 0);

  const age = { "< 1 day": a.ticket_age.lt1, "1–3 days": a.ticket_age.d1_3, "3–7 days": a.ticket_age.d3_7, "> 7 days": a.ticket_age.gt7 };

  const paidLicences = planMix.filter(([plan]) => plan !== "FREE").reduce((n, [, c]) => n + c, 0);
  const simple = (rows: [string, number][], label: string) => (
    <Table aria-label={label} className="aorms-table-spaced" size="sm">
      <TableHead>
        <TableRow>
          <TableHeader>{label}</TableHeader>
          <TableHeader>Count</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(([k, n]) => (
          <TableRow key={k}>
            <TableCell>{k}</TableCell>
            <TableCell>{n}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={2}>No data yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Analytics" result="The platform's health in numbers." description="Counts and sums of real rows — captured payments for revenue (no modelled MRR or churn). Last 12 months, UTC." />
          <div className="aorms-bigstat-row">
            <BigStat value={studios} label="Studios" />
            <BigStat value={accounts} label="Accounts" />
            <BigStat value={paidLicences} label="Paid licences" />
            <BigStat value={inr(total12)} label="Captured, 12 months" />
            <BigStat value={quotes} label="Quote requests" />
          </div>

          <h2 className="cds--type-heading-02" style={{ margin: "1rem 0" }}>
            Captured revenue by month
          </h2>
          <Table aria-label="Captured revenue by month" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Month</TableHeader>
                <TableHeader>Studio licences</TableHeader>
                <TableHeader>Identity</TableHeader>
                <TableHeader>ConnectDeX</TableHeader>
                <TableHeader>Total</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...rev.entries()].reverse().map(([m, b]) => (
                <TableRow key={m}>
                  <TableCell>{m}</TableCell>
                  <TableCell>{inr(b.licence)}</TableCell>
                  <TableCell>{inr(b.identity)}</TableCell>
                  <TableCell>{inr(b.connectdex)}</TableCell>
                  <TableCell>{inr(b.licence + b.identity + b.connectdex)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Grid narrow style={{ marginTop: "2rem", paddingInline: 0 }}>
            <Column sm={4} md={4} lg={4}>
              <h2 className="cds--type-heading-02">Licence plan mix</h2>
              {simple(planMix, "Plan")}
            </Column>
            <Column sm={4} md={4} lg={4}>
              <h2 className="cds--type-heading-02">ConnectDeX applications</h2>
              {simple(appFunnel, "Status")}
            </Column>
            <Column sm={4} md={4} lg={4}>
              <h2 className="cds--type-heading-02">Companies by status</h2>
              {simple(companyStatus, "Status")}
              <h2 className="cds--type-heading-02" style={{ marginTop: "1.5rem" }}>
                Companies by tier
              </h2>
              {simple(tierMix, "Tier")}
            </Column>
            <Column sm={4} md={4} lg={4}>
              <h2 className="cds--type-heading-02">Open ticket age</h2>
              {simple(Object.entries(age), "Age")}
            </Column>
          </Grid>
        </Column>
      </Grid>
    </>
  );
}
