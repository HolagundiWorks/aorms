import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { AnimatedNumber } from "../AnimatedNumber";
import { BigStat } from "../BigStat";

/**
 * Landing demo of the Invoices screen (2026-10-06): the portal's KPI rail (`BigStat`) and Carbon table with
 * dummy invoices; every figure counts up when the board is first shown, and the rail is computed from the
 * rows so it always adds up. Sample data only.
 */
const ROWS = [
  { ref: "INV-01", client: "Aurelia Developers", total: 590000, paid: 590000, status: "PAID" },
  { ref: "INV-02", client: "Aurelia Developers", total: 767000, paid: 0, status: "ISSUED" },
  { ref: "INV-05", client: "Silver Oak Builders", total: 2596000, paid: 1000000, status: "PARTIAL" },
  { ref: "INV-08", client: "Ananya & Kabir Menon", total: 165200, paid: 0, status: "DRAFT" },
] as const;

const TAG: Record<string, "green" | "blue" | "gray" | "purple"> = { PAID: "green", ISSUED: "blue", "PARTIAL": "purple", DRAFT: "gray" };

export function LiveInvoices() {
  const invoiced = ROWS.filter((r) => r.status !== "DRAFT").reduce((a, r) => a + r.total, 0);
  const outstanding = ROWS.filter((r) => r.status !== "DRAFT").reduce((a, r) => a + (r.total - r.paid), 0);
  const paidCount = ROWS.filter((r) => r.status === "PAID").length;
  return (
    <div aria-hidden style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)", padding: "1rem 1.25rem" }}>
      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
        Invoices
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem 1.5rem", margin: "0.5rem 0 0.75rem" }}>
        <BigStat value={ROWS.length} label="Invoices" animate="plain" />
        <BigStat value={invoiced} label="Invoiced" animate="inr" />
        <BigStat value={outstanding} label="Outstanding" animate="inr" active />
        <BigStat value={paidCount} label="Paid" animate="plain" />
      </div>
      <Table size="sm" aria-label="Sample invoices">
        <TableHead>
          <TableRow>
            <TableHeader>Ref</TableHeader>
            <TableHeader>Client</TableHeader>
            <TableHeader>Total</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r.ref}>
              <TableCell>
                <span className="aorms-project-card__ref" style={{ whiteSpace: "nowrap" }}>{r.ref}</span>
              </TableCell>
              <TableCell>{r.client}</TableCell>
              <TableCell className="aorms-num">
                <AnimatedNumber value={r.total} kind="inr" />
              </TableCell>
              <TableCell>
                <Tag type={TAG[r.status]} size="sm">
                  {r.status}
                </Tag>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
