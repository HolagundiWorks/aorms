import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { NewNegotiationRoundForm } from "../../../../../components/aorms/NewNegotiationRoundForm";
import { NegotiationOutcomeSelect } from "../../../../../components/aorms/NegotiationOutcomeSelect";

function formatInr(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(paise) / 100).toLocaleString("en-IN")}`;
}

export default async function NegotiationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: rounds, error: roundsError }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("project_negotiations")
      .select("id, round_no, fee_change_paise, discount_requested_pct, outcome, conversion_probability, scope_changes, timeline_changes")
      .eq("project_id", id)
      .order("round_no"),
  ]);

  if (projectError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!project) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Negotiation
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Commercial negotiation rounds. Conversion probability is computed automatically —
          confidence erodes with each extra round and cumulative discount conceded, advisory only.
        </p>

        <NewNegotiationRoundForm projectId={project.id} />

        {roundsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load rounds: {roundsError.message}
          </p>
        ) : (
          <Table aria-label="Negotiation rounds" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Round</TableHeader>
                <TableHeader>Fee change</TableHeader>
                <TableHeader>Discount %</TableHeader>
                <TableHeader>Conversion probability</TableHeader>
                <TableHeader>Outcome</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rounds ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.round_no}</TableCell>
                  <TableCell>{formatInr(r.fee_change_paise)}</TableCell>
                  <TableCell>{r.discount_requested_pct}%</TableCell>
                  <TableCell>{r.conversion_probability}%</TableCell>
                  <TableCell>
                    <NegotiationOutcomeSelect projectId={project.id} negotiationId={r.id} outcome={r.outcome} />
                  </TableCell>
                </TableRow>
              ))}
              {(rounds ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No negotiation rounds yet.
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
