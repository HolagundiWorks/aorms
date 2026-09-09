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
import { AddMilestoneForm } from "../../../components/aorms/AddMilestoneForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { MilestoneStatusSelect } from "../../../components/aorms/MilestoneStatusSelect";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function PmcMilestonesPage() {
  const supabase = await createClient();

  const [{ data: milestones, error }, { data: projects }] = await Promise.all([
    supabase
      .from("pmc_milestones")
      .select("id, ref, title, planned_date, actual_date, percent_complete, status, project_offices(title)")
      .order("sort_order"),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = milestones ?? [];
  const atRiskCount = rows.filter((m) => m.status === "AT_RISK" || m.status === "DELAYED").length;
  const completeCount = rows.filter((m) => m.status === "COMPLETE").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New milestone" description="Add a project delivery milestone.">
        <AddMilestoneForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Programme Milestones"
          description="Owner-side project delivery milestones. CSV/P6 XER import isn't wired up."
          actions={<ContextPanelTrigger size="sm">New milestone</ContextPanelTrigger>}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total milestones" value={rows.length} />
          <KpiTile label="At risk / delayed" value={atRiskCount} />
          <KpiTile label="Complete" value={completeCount} />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load milestones: {error.message}
          </p>
        ) : (
          <Table aria-label="Milestones" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Planned</TableHeader>
                <TableHeader>Actual</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(milestones ?? []).map((m) => {
                const project = Array.isArray(m.project_offices) ? m.project_offices[0] : (m.project_offices as { title: string } | null);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.ref}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{m.planned_date ?? "—"}</TableCell>
                    <TableCell>{m.actual_date ?? "—"}</TableCell>
                    <TableCell>
                      <MilestoneStatusSelect milestoneId={m.id} status={m.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(milestones ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No milestones yet.
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
