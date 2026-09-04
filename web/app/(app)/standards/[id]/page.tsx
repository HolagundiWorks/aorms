import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewStandardFileForm } from "../../../../components/aorms/NewStandardFileForm";

export default async function StandardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: standard, error: standardError }, { data: files, error: filesError }] = await Promise.all([
    supabase.from("standards").select("id, discipline, title, notes").eq("id", id).maybeSingle(),
    supabase
      .from("standard_files")
      .select("id, kind, file_name, created_at")
      .eq("standard_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (standardError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load standard: {standardError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!standard) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {standard.discipline}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {standard.title}
        </h1>
        {standard.notes && (
          <p className="cds--type-body-01" style={{ marginBottom: "2rem", color: "var(--cds-text-secondary)" }}>
            {standard.notes}
          </p>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Files
        </h2>

        <NewStandardFileForm standardId={standard.id} />

        {filesError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load files: {filesError.message}
          </p>
        ) : (
          <Table aria-label="Standard files" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>File</TableHeader>
                <TableHeader>Kind</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(files ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.file_name}</TableCell>
                  <TableCell>{f.kind}</TableCell>
                </TableRow>
              ))}
              {(files ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No files yet.
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
