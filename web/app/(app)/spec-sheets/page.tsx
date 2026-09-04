import Link from "next/link";
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
import { NewSpecSheetForm } from "../../../components/aorms/NewSpecSheetForm";

export default async function SpecSheetsPage() {
  const supabase = await createClient();

  const [{ data: sheets, error }, { data: projects }] = await Promise.all([
    supabase
      .from("spec_sheets")
      .select("id, ref, title, status, version_no, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Spec Sheets</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Per-project material specification documents.
        </p>

        <NewSpecSheetForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load spec sheets: {error.message}
          </p>
        ) : (
          <Table aria-label="Spec Sheets" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Version</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(sheets ?? []).map((s) => {
                const project = Array.isArray(s.project_offices)
                  ? s.project_offices[0]
                  : (s.project_offices as { title: string } | null);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/spec-sheets/${s.id}`}>{s.ref}</Link>
                    </TableCell>
                    <TableCell>{s.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{s.version_no}</TableCell>
                    <TableCell>
                      <Tag type={s.status === "DRAFT" ? "gray" : "green"} size="sm">
                        {s.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(sheets ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No spec sheets yet.
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
