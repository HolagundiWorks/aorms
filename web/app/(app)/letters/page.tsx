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
import { NewLetterForm } from "../../../components/aorms/NewLetterForm";

export default async function LettersPage() {
  const supabase = await createClient();

  const [{ data: letters, error }, { data: projects }] = await Promise.all([
    supabase
      .from("letters")
      .select("id, ref, recipient, subject, date_letter, pdf_status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Letters</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Office correspondence register.
        </p>

        <NewLetterForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load letters: {error.message}
          </p>
        ) : (
          <Table aria-label="Letters" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Recipient</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>PDF</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(letters ?? []).map((l) => {
                const project = Array.isArray(l.project_offices)
                  ? l.project_offices[0]
                  : (l.project_offices as { title: string } | null);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.ref}</TableCell>
                    <TableCell>{l.recipient}</TableCell>
                    <TableCell>{l.subject}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{l.date_letter ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={l.pdf_status === "READY" ? "green" : "gray"} size="sm">
                        {l.pdf_status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(letters ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No letters yet.
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
