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
import { NewDrawingForm } from "../../../components/aorms/NewDrawingForm";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  READY: "green",
  FAILED: "red",
};

export default async function DrawingsPage() {
  const supabase = await createClient();

  const [{ data: drawings, error }, { data: projects }] = await Promise.all([
    supabase
      .from("drawings")
      .select("id, ref, title, file_name, status, review_status, rev_no, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Drawings</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          DXF register with worker-driven takeoff and revision chaining.
        </p>

        <NewDrawingForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load drawings: {error.message}
          </p>
        ) : (
          <Table aria-label="Drawings" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Rev</TableHeader>
                <TableHeader>Review</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(drawings ?? []).map((d) => {
                const project = Array.isArray(d.project_offices)
                  ? d.project_offices[0]
                  : (d.project_offices as { title: string } | null);
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.ref}</TableCell>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{d.rev_no}</TableCell>
                    <TableCell>{d.review_status}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[d.status] ?? "gray"} size="sm">
                        {d.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(drawings ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No drawings yet.
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
