import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { resolvePeriodRange, type PeriodFilterInput } from "../../../lib/tax/fy";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type MonthBucket = {
  period: string;
  count: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  gstTotalPaise: number;
  compositionLevyPaise: number;
  invoiceTotalPaise: number;
  tdsCount: number;
  /** Taxable (gross) value of just the TDS-applicable invoices in this
   * bucket — deliberately separate from `taxablePaise` (every invoice's
   * taxable value): mixing the two would show a month's *whole* taxable
   * total as the "Gross" figure on a TDS abstract row that's only
   * summing a subset of that month's invoices. */
  tdsTaxablePaise: number;
  tdsPaise: number;
  netReceivablePaise: number;
};

function emptyBucket(period: string): MonthBucket {
  return {
    period,
    count: 0,
    taxablePaise: 0,
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: 0,
    gstTotalPaise: 0,
    compositionLevyPaise: 0,
    invoiceTotalPaise: 0,
    tdsCount: 0,
    tdsTaxablePaise: 0,
    tdsPaise: 0,
    netReceivablePaise: 0,
  };
}

/**
 * GST/TDS filing abstract — port of backend/src/modules/reports/router.ts's
 * `gstAbstract`/`tdsAbstract`, the exact gap Phase 3/5 both flagged and the
 * plain "invoice register by status" this page used to be instead. Grouped
 * by month within the chosen period, same as the old backend's `to_char(...,
 * 'YYYY-MM')` — computed here in JS from the raw rows rather than a SQL
 * GROUP BY, since Supabase's JS client has no way to group by a computed
 * expression the way Drizzle's raw `sql` tag could; invoice volume for one
 * firm is small enough that this is the pragmatic choice, not a scale risk.
 *
 * One simplification from the old backend: the period date used here is
 * `date_invoice` alone, not `coalesce(date_invoice, created_at::date)` — an
 * ISSUED/PAID invoice with no invoice date can't meaningfully sit in a GST
 * filing period anyway, so it's excluded rather than silently dated by
 * creation time.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; fy?: string; quarter?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const rank: Record<string, number> = {
    OWNER: 100,
    PARTNER: 80,
    ACCOUNTANT: 80,
    HR_MANAGER: 80,
    SENIOR: 60,
    ASSOCIATE: 40,
    VIEWER: 20,
  };
  const canView = (rank[profile?.role ?? ""] ?? 0) >= 80;

  if (!canView) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <h1 className="cds--type-heading-05">Financial Reports</h1>
          <InlineNotification
            kind="error"
            title="Restricted"
            subtitle="Financial reports require partner-level access or above."
            hideCloseButton
            lowContrast
          />
        </Column>
      </Grid>
    );
  }

  const periodInput: PeriodFilterInput = {
    preset: (sp.preset as PeriodFilterInput["preset"]) ?? "CURRENT_FY",
    fy: sp.fy,
    quarter: sp.quarter as PeriodFilterInput["quarter"],
    month: sp.month,
  };
  const { from, to, label } = resolvePeriodRange(periodInput);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      "date_invoice, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, composition_levy_paise, grand_total_paise, tds_applicable, tds_paise, net_receivable_paise",
    )
    .in("status", ["ISSUED", "PAID"])
    .gte("date_invoice", from)
    .lte("date_invoice", to)
    .order("date_invoice");

  const buckets = new Map<string, MonthBucket>();
  for (const inv of invoices ?? []) {
    const month = (inv.date_invoice ?? "").slice(0, 7); // YYYY-MM
    const b = buckets.get(month) ?? emptyBucket(month);
    b.count += 1;
    b.taxablePaise += inv.taxable_paise ?? 0;
    b.cgstPaise += inv.cgst_paise ?? 0;
    b.sgstPaise += inv.sgst_paise ?? 0;
    b.igstPaise += inv.igst_paise ?? 0;
    b.gstTotalPaise += inv.gst_total_paise ?? 0;
    b.compositionLevyPaise += inv.composition_levy_paise ?? 0;
    b.invoiceTotalPaise += inv.grand_total_paise ?? 0;
    if (inv.tds_applicable && (inv.tds_paise ?? 0) > 0) {
      b.tdsCount += 1;
      b.tdsTaxablePaise += inv.taxable_paise ?? 0;
      b.tdsPaise += inv.tds_paise ?? 0;
      b.netReceivablePaise += inv.net_receivable_paise ?? 0;
    }
    buckets.set(month, b);
  }
  const periods = Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
  const totals = periods.reduce(
    (a, p) => ({
      period: "Total",
      count: a.count + p.count,
      taxablePaise: a.taxablePaise + p.taxablePaise,
      cgstPaise: a.cgstPaise + p.cgstPaise,
      sgstPaise: a.sgstPaise + p.sgstPaise,
      igstPaise: a.igstPaise + p.igstPaise,
      gstTotalPaise: a.gstTotalPaise + p.gstTotalPaise,
      compositionLevyPaise: a.compositionLevyPaise + p.compositionLevyPaise,
      invoiceTotalPaise: a.invoiceTotalPaise + p.invoiceTotalPaise,
      tdsCount: a.tdsCount + p.tdsCount,
      tdsTaxablePaise: a.tdsTaxablePaise + p.tdsTaxablePaise,
      tdsPaise: a.tdsPaise + p.tdsPaise,
      netReceivablePaise: a.netReceivablePaise + p.netReceivablePaise,
    }),
    emptyBucket("Total"),
  );

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Financial Reports</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          GST/TDS filing abstract, by month — {label}. Only ISSUED/PAID invoices with an invoice date are included.
        </p>

        <form method="get" style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap" }}>
          <Select id="preset" name="preset" labelText="Period" defaultValue={periodInput.preset}>
            <SelectItem value="CURRENT_FY" text="Current financial year" />
            <SelectItem value="PREVIOUS_FY" text="Previous financial year" />
          </Select>
          <Button type="submit" size="md">
            Apply
          </Button>
        </form>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load invoices: {error.message}
          </p>
        ) : periods.length === 0 ? (
          <Tile>
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No issued invoices in {label}.
            </p>
          </Tile>
        ) : (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
              GST abstract
            </h2>
            <div style={{ overflowX: "auto" }}>
            <Table aria-label="GST abstract by month" size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Month</TableHeader>
                  <TableHeader>Invoices</TableHeader>
                  <TableHeader>Taxable</TableHeader>
                  <TableHeader>CGST</TableHeader>
                  <TableHeader>SGST</TableHeader>
                  <TableHeader>IGST</TableHeader>
                  <TableHeader>GST total</TableHeader>
                  <TableHeader>Composition levy</TableHeader>
                  <TableHeader>Invoice total</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.period}>
                    <TableCell>{p.period}</TableCell>
                    <TableCell>{p.count}</TableCell>
                    <TableCell>{formatInr(p.taxablePaise)}</TableCell>
                    <TableCell>{formatInr(p.cgstPaise)}</TableCell>
                    <TableCell>{formatInr(p.sgstPaise)}</TableCell>
                    <TableCell>{formatInr(p.igstPaise)}</TableCell>
                    <TableCell>{formatInr(p.gstTotalPaise)}</TableCell>
                    <TableCell>{formatInr(p.compositionLevyPaise)}</TableCell>
                    <TableCell>{formatInr(p.invoiceTotalPaise)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Total</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{totals.count}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.taxablePaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.cgstPaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.sgstPaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.igstPaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.gstTotalPaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.compositionLevyPaise)}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.invoiceTotalPaise)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>

            <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
              TDS abstract (s.194J)
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
              TDS your clients deducted on professional fees paid to you — reconcile against Form 26AS/AIS.
            </p>
            <Table aria-label="TDS abstract by month" size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Month</TableHeader>
                  <TableHeader>Invoices</TableHeader>
                  <TableHeader>Gross (taxable)</TableHeader>
                  <TableHeader>TDS deducted</TableHeader>
                  <TableHeader>Net receivable</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods
                  .filter((p) => p.tdsCount > 0)
                  .map((p) => (
                    <TableRow key={p.period}>
                      <TableCell>{p.period}</TableCell>
                      <TableCell>{p.tdsCount}</TableCell>
                      <TableCell>{formatInr(p.tdsTaxablePaise)}</TableCell>
                      <TableCell>{formatInr(p.tdsPaise)}</TableCell>
                      <TableCell>{formatInr(p.netReceivablePaise)}</TableCell>
                    </TableRow>
                  ))}
                {totals.tdsCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No TDS-applicable invoices in {label}.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell style={{ fontWeight: 600 }}>Total</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{totals.tdsCount}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.tdsTaxablePaise)}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.tdsPaise)}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{formatInr(totals.netReceivablePaise)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </Column>
    </Grid>
  );
}
