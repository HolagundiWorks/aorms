import { Column, Grid, InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Simplified invoice-register report. Deliberately NOT a full GST/TDS
 * abstract (gstAbstract/tdsAbstract in the current backend) — those need
 * the tax engine (cgst/sgst/igst breakdown) Phase 3's invoices UI already
 * flagged as not ported. This groups by status instead, the one dimension
 * that's actually meaningful on today's DRAFT-only-taxable-amount data.
 * RLS/page gate matches reports:view's rank (80, same tier as
 * invoice:manage/fees:manage) — checked here at the page level since
 * invoices' own RLS is invoice:manage, already equivalent.
 */
export default async function ReportsPage() {
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

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("status, taxable_paise, grand_total_paise, paid_paise");

  const rows = invoices ?? [];
  const byStatus = new Map<string, { count: number; taxable: number; grandTotal: number; paid: number }>();
  for (const inv of rows) {
    const bucket = byStatus.get(inv.status) ?? { count: 0, taxable: 0, grandTotal: 0, paid: 0 };
    bucket.count += 1;
    bucket.taxable += inv.taxable_paise ?? 0;
    bucket.grandTotal += inv.grand_total_paise ?? 0;
    bucket.paid += inv.paid_paise ?? 0;
    byStatus.set(inv.status, bucket);
  }

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Financial Reports</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Invoice register by status. GST/TDS abstracts aren&apos;t available yet — the tax engine isn&apos;t wired up.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load invoices: {error.message}
          </p>
        ) : byStatus.size === 0 ? (
          <Tile>
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No invoices yet.
            </p>
          </Tile>
        ) : (
          <Table aria-label="Invoice register by status">
            <TableHead>
              <TableRow>
                <TableHeader>Status</TableHeader>
                <TableHeader>Count</TableHeader>
                <TableHeader>Taxable</TableHeader>
                <TableHeader>Grand total</TableHeader>
                <TableHeader>Received</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from(byStatus.entries()).map(([status, b]) => (
                <TableRow key={status}>
                  <TableCell>{status}</TableCell>
                  <TableCell>{b.count}</TableCell>
                  <TableCell>{formatInr(b.taxable)}</TableCell>
                  <TableCell>{formatInr(b.grandTotal)}</TableCell>
                  <TableCell>{formatInr(b.paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
