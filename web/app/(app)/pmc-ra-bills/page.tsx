import Link from "next/link";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddRaBillForm } from "../../../components/aorms/AddRaBillForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { RaBillStatusSelect } from "../../../components/aorms/RaBillStatusSelect";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PmcRaBillsPage() {
  const supabase = await createClient();

  const [{ data: bills, error }, { data: projects }] = await Promise.all([
    supabase
      .from("pmc_ra_bills")
      .select("id, ref, bill_no, period_start, period_end, gross_paise, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <ContextPanelLayout>
      <ContextPanel title="New RA bill" description="Start a new contractor running-account bill.">
        <AddRaBillForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Running Account Bills"
          description="Contractor RA bills for AProc work packages — distinct from the Estimation module's own running_bills. CERTIFIED additionally requires cost:approve (database trigger)."
          actions={<ContextPanelTrigger size="sm">New RA bill</ContextPanelTrigger>}
        />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load bills: {error.message}
          </p>
        ) : (
          <Table aria-label="RA bills" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Bill no</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Period</TableHeader>
                <TableHeader>Gross</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(bills ?? []).map((b) => {
                const project = Array.isArray(b.project_offices) ? b.project_offices[0] : (b.project_offices as { title: string } | null);
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/pmc-ra-bills/${b.id}`}>{b.ref}</Link>
                    </TableCell>
                    <TableCell>{b.bill_no}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>
                      {b.period_start} – {b.period_end}
                    </TableCell>
                    <TableCell>{formatInr(b.gross_paise)}</TableCell>
                    <TableCell>
                      <RaBillStatusSelect billId={b.id} status={b.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(bills ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No RA bills yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
      </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
