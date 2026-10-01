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
  const cx = svc.schema("connectdex");
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  since.setUTCHours(0, 0, 0, 0);

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [studios, accounts, licences, payments, identityPay, cxPay, apps, companies, tickets, quotes] = await Promise.all([
    count(svc.from("studios").select("id", { count: "exact", head: true })),
    count(svc.from("accounts").select("id", { count: "exact", head: true })),
    svc.from("licences").select("plan"),
    svc.from("payments").select("amount_paise, created_at").eq("status", "CAPTURED").gte("created_at", since.toISOString()),
    svc.from("identity_payments").select("amount_paise, created_at").eq("status", "CAPTURED").gte("created_at", since.toISOString()),
    cx.from("connectdex_payments").select("amount_paise, created_at").eq("status", "CAPTURED").gte("created_at", since.toISOString()),
    cx.from("connectdex_applications").select("status"),
    cx.from("companies").select("status, tier"),
    svc.from("support_tickets").select("status, created_at").in("status", ["OPEN", "IN_PROGRESS"]),
    count(cx.from("quote_requests").select("id", { count: "exact", head: true })),
  ]);

  const tally = <T,>(rows: T[] | null, key: (r: T) => string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const planMix = tally(licences.data, (l) => l.plan);
  const appFunnel = tally(apps.data, (a) => a.status);
  const companyStatus = tally(companies.data, (c) => c.status);
  const tierMix = tally(companies.data, (c) => c.tier ?? "—");

  // Revenue by month (captured payments across Studio licences, Identity and ConnectDeX fees).
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const rev = new Map(months.map((m) => [m, { licence: 0, identity: 0, connectdex: 0 }]));
  const add = (rows: { amount_paise: number; created_at: string }[] | null, k: "licence" | "identity" | "connectdex") => {
    for (const r of rows ?? []) {
      const b = rev.get(r.created_at.slice(0, 7));
      if (b) b[k] += r.amount_paise;
    }
  };
  add(payments.data, "licence");
  add(identityPay.data, "identity");
  add(cxPay.data, "connectdex");
  const total12 = [...rev.values()].reduce((s, b) => s + b.licence + b.identity + b.connectdex, 0);

  const now = Date.now();
  const age = { "< 1 day": 0, "1–3 days": 0, "3–7 days": 0, "> 7 days": 0 };
  for (const t of tickets.data ?? []) {
    const days = (now - new Date(t.created_at).getTime()) / 86_400_000;
    age[days < 1 ? "< 1 day" : days < 3 ? "1–3 days" : days < 7 ? "3–7 days" : "> 7 days"]++;
  }

  const paidLicences = (licences.data ?? []).filter((l) => l.plan !== "FREE").length;
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
