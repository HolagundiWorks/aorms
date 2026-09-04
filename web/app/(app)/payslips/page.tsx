import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewPayslipForm } from "../../../components/aorms/NewPayslipForm";
import { MarkPaidButton } from "../../../components/aorms/MarkPaidButton";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PayslipsPage() {
  const supabase = await createClient();

  const [{ data: payslips, error }, { data: members }] = await Promise.all([
    supabase
      .from("payslips")
      .select("id, month, gross_paise, deductions_paise, net_paise, paid, team_members(name)")
      .order("month", { ascending: false }),
    supabase.from("team_members").select("id, name").order("name"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Payslips</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Monthly payslips per team member. PDF generation isn&apos;t wired up — same worker/
          hosting-topology question Phase 6 flagged for every render target.
        </p>

        <NewPayslipForm members={members ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load payslips: {error.message}
          </p>
        ) : (
          <Table aria-label="Payslips" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Member</TableHeader>
                <TableHeader>Month</TableHeader>
                <TableHeader>Gross</TableHeader>
                <TableHeader>Deductions</TableHeader>
                <TableHeader>Net</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(payslips ?? []).map((p) => {
                const member = Array.isArray(p.team_members) ? p.team_members[0] : (p.team_members as { name: string } | null);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{member?.name ?? "—"}</TableCell>
                    <TableCell>{p.month}</TableCell>
                    <TableCell>{formatInr(p.gross_paise)}</TableCell>
                    <TableCell>{formatInr(p.deductions_paise)}</TableCell>
                    <TableCell>{formatInr(p.net_paise)}</TableCell>
                    <TableCell>
                      {p.paid ? (
                        <Tag type="green" size="sm">
                          Paid
                        </Tag>
                      ) : (
                        <MarkPaidButton payslipId={p.id} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(payslips ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No payslips yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
