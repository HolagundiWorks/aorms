import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

/**
 * Project take-off — project picker. See lib/takeoff/formulas.ts and
 * migration 0027_project_takeoff.sql for what this feature is (IS 1200
 * wall measurement — masonry/plaster/painting with door/window opening
 * deductions — the auto-derivation gap flagged against HolagundiWorks/AQC).
 */
export default async function TakeoffPage() {
  const supabase = await createClient();

  const [{ data: projects, error }, { data: items }] = await Promise.all([
    supabase.from("project_offices").select("id, title, ref").order("title"),
    supabase.from("takeoff_items").select("project_id"),
  ]);

  const countByProject = new Map<string, number>();
  for (const it of items ?? []) {
    countByProject.set(it.project_id, (countByProject.get(it.project_id) ?? 0) + 1);
  }

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Take-off</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          IS 1200 wall measurement — masonry, plaster, and painting quantities computed from
          length/height and linked door/window openings, not typed in directly. Pick a project.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load projects: {error.message}
          </p>
        ) : (
          <Table aria-label="Projects" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Take-off items</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(projects ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/takeoff/${p.id}`}>{p.ref}</Link>
                  </TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{countByProject.get(p.id) ?? 0}</TableCell>
                </TableRow>
              ))}
              {(projects ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
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
