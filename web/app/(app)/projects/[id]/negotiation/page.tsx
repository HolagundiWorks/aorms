import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { AddNegotiationRoundForm } from "../../../../../components/aorms/AddNegotiationRoundForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../../../components/aorms/KpiTile";
import { NegotiationOutcomeSelect } from "../../../../../components/aorms/NegotiationOutcomeSelect";
import { PageHeader } from "../../../../../components/aorms/PageHeader";

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
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!project) notFound();

  const rows = rounds ?? [];
  const agreedCount = rows.filter((r) => r.outcome === "AGREED").length;
  const latestConversion = rows.length ? rows[rows.length - 1].conversion_probability : null;

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add negotiation round" description="Log a commercial negotiation round.">
        <AddNegotiationRoundForm projectId={project.id} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow={project.title}
          title="Negotiation"
          description="Commercial negotiation rounds. Conversion probability is computed automatically — confidence erodes with each extra round and cumulative discount conceded, advisory only."
          actions={<ContextPanelTrigger size="sm">Add round</ContextPanelTrigger>}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total rounds" value={rows.length} />
          <KpiTile label="Agreed" value={agreedCount} />
          <KpiTile label="Latest conversion" value={latestConversion != null ? `${latestConversion}%` : "—"} />
        </div>

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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
