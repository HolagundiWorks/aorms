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
import { NewSnagForm } from "../../../components/aorms/NewSnagForm";
import { SnagStatusSelect } from "../../../components/aorms/SnagStatusSelect";

export default async function SnagsPage() {
  const supabase = await createClient();

  const [{ data: snags, error }, { data: projects }] = await Promise.all([
    supabase
      .from("snags")
      .select("id, ref, location, trade, description, status, due_date, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Snags</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Site defect register. Photo attachments aren&apos;t wired up yet.
        </p>

        <NewSnagForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load snags: {error.message}
          </p>
        ) : (
          <Table aria-label="Snags" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Trade</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Due</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(snags ?? []).map((s) => {
                const project = Array.isArray(s.project_offices) ? s.project_offices[0] : (s.project_offices as { title: string } | null);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.ref}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{s.location ?? "—"}</TableCell>
                    <TableCell>{s.trade ?? "—"}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell>{s.due_date ?? "—"}</TableCell>
                    <TableCell>
                      <SnagStatusSelect snagId={s.id} status={s.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(snags ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No snags yet.
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
