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
import { NewMomForm } from "../../../components/aorms/NewMomForm";

export default async function MomsPage() {
  const supabase = await createClient();

  const [{ data: moms, error }, { data: projects }] = await Promise.all([
    supabase
      .from("moms")
      .select("id, ref, title, meeting_date, venue, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Meeting Minutes</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          MOMs — minutes of meeting, per project.
        </p>

        <NewMomForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load minutes: {error.message}
          </p>
        ) : (
          <Table aria-label="Meeting Minutes" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Venue</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(moms ?? []).map((m) => {
                const project = Array.isArray(m.project_offices)
                  ? m.project_offices[0]
                  : (m.project_offices as { title: string } | null);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.ref}</TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{m.meeting_date ?? "—"}</TableCell>
                    <TableCell>{m.venue ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={m.status === "DRAFT" ? "gray" : "green"} size="sm">
                        {m.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(moms ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No minutes yet.
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
