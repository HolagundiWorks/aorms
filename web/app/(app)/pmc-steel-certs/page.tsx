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
import { NewSteelCertForm } from "../../../components/aorms/NewSteelCertForm";
import { SteelCertStatusSelect } from "../../../components/aorms/SteelCertStatusSelect";

export default async function PmcSteelCertsPage() {
  const supabase = await createClient();

  const [{ data: certs, error }, { data: projects }] = await Promise.all([
    supabase
      .from("pmc_steel_certs")
      .select("id, ref, period_start, period_end, issued_kg, consumed_kg, wastage_pct, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Steel Certification</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Issued vs consumed steel by period, with wastage. The CERTIFIED status additionally
          requires the cost:approve capability — enforced by a database trigger, not just this
          page, so a user without it sees the trigger&apos;s own rejection.
        </p>

        <NewSteelCertForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load certificates: {error.message}
          </p>
        ) : (
          <Table aria-label="Steel certificates" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Period</TableHeader>
                <TableHeader>Issued (kg)</TableHeader>
                <TableHeader>Consumed (kg)</TableHeader>
                <TableHeader>Wastage %</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(certs ?? []).map((c) => {
                const project = Array.isArray(c.project_offices) ? c.project_offices[0] : (c.project_offices as { title: string } | null);
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.ref}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>
                      {c.period_start} – {c.period_end}
                    </TableCell>
                    <TableCell>{c.issued_kg}</TableCell>
                    <TableCell>{c.consumed_kg}</TableCell>
                    <TableCell>{c.wastage_pct}%</TableCell>
                    <TableCell>
                      <SteelCertStatusSelect certId={c.id} status={c.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(certs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No certificates yet.
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
