import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

export default async function PortalHomePage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("project_offices")
    .select("id, ref, title, status, project_type")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Your projects</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Published progress, invoices, drawings and documents for your projects with us.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load your projects: {error.message}
          </p>
        ) : (
          <Table aria-label="Your projects" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(projects ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/portal/${p.id}`}>{p.ref}</Link>
                  </TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.project_type ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type="blue" size="sm">
                      {p.status}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
              {(projects ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No projects yet.
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
