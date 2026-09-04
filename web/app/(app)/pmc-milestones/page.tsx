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
import { NewMilestoneForm } from "../../../components/aorms/NewMilestoneForm";
import { MilestoneStatusSelect } from "../../../components/aorms/MilestoneStatusSelect";

export default async function PmcMilestonesPage() {
  const supabase = await createClient();

  const [{ data: milestones, error }, { data: projects }] = await Promise.all([
    supabase
      .from("pmc_milestones")
      .select("id, ref, title, planned_date, actual_date, percent_complete, status, project_offices(title)")
      .order("sort_order"),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Programme Milestones</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Owner-side project delivery milestones. CSV/P6 XER import isn&apos;t wired up.
        </p>

        <NewMilestoneForm projects={projects ?? []} />

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
  );
}
