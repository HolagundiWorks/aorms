import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { GenerateFeasibilityButton } from "../../../../../components/aorms/GenerateFeasibilityButton";

export default async function FeasibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const hdrs = await headers();
  const origin = `${hdrs.get("x-forwarded-proto") ?? "http"}://${hdrs.get("host") ?? "localhost:3000"}`;

  const [{ data: project, error: projectError }, { data: reports, error: reportsError }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("feasibility_reports")
      .select("id, share_token, generated_at, snapshot")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
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
          Feasibility Reports
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          A frozen snapshot of the pre-project assessment at generation time — later assessment
          edits don&apos;t change a report already shared. Each report gets an anonymous share
          link (no login required) that serves the snapshot read-only.
        </p>

        <GenerateFeasibilityButton projectId={project.id} />

        {reportsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load reports: {reportsError.message}
          </p>
        ) : (
          <Table aria-label="Feasibility reports" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Generated</TableHeader>
                <TableHeader>Estimated cost</TableHeader>
                <TableHeader>Share link</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(reports ?? []).map((r) => {
                const snapshot = r.snapshot as { estimatedProjectCostPaise?: number } | null;
                const shareUrl = `${origin}/api/feasibility/${r.share_token}`;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.generated_at ? new Date(r.generated_at).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell>
                      {snapshot?.estimatedProjectCostPaise != null
                        ? `₹${(snapshot.estimatedProjectCostPaise / 100).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <code style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{shareUrl}</code>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(reports ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No reports generated yet.
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
