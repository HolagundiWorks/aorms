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
import { NewProgressReportForm } from "../../../components/aorms/NewProgressReportForm";
import { IssueProgressReportButton } from "../../../components/aorms/IssueProgressReportButton";

export default async function ProgressReportsPage() {
  const supabase = await createClient();

  const [{ data: reports, error }, { data: projects }] = await Promise.all([
    supabase
      .from("progress_reports")
      .select("id, period_start, period_end, physical_progress_pct, schedule_progress_pct, status, project_offices(title)")
      .order("period_start", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Progress Reports</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Periodic project progress narrative and completion percentages. PDF rendering isn&apos;t
          wired up.
        </p>

        <NewProgressReportForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load reports: {error.message}
          </p>
        ) : (
          <Table aria-label="Progress reports" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Period</TableHeader>
                <TableHeader>Physical %</TableHeader>
                <TableHeader>Schedule %</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(reports ?? []).map((r) => {
                const project = Array.isArray(r.project_offices) ? r.project_offices[0] : (r.project_offices as { title: string } | null);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>
                      {r.period_start} – {r.period_end}
                    </TableCell>
                    <TableCell>{r.physical_progress_pct != null ? `${r.physical_progress_pct}%` : "—"}</TableCell>
                    <TableCell>{r.schedule_progress_pct != null ? `${r.schedule_progress_pct}%` : "—"}</TableCell>
                    <TableCell>
                      <Tag type={r.status === "ISSUED" ? "green" : "gray"} size="sm">
                        {r.status}
                      </Tag>
                    </TableCell>
                    <TableCell>{r.status === "DRAFT" && <IssueProgressReportButton reportId={r.id} />}</TableCell>
                  </TableRow>
                );
              })}
              {(reports ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No progress reports yet.
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
