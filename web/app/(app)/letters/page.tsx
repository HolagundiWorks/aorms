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
import { AddLetterForm } from "../../../components/aorms/AddLetterForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateLetterPdf } from "../../../lib/actions/letters";

export default async function LettersPage() {
  const supabase = await createClient();

  const [{ data: letters, error }, { data: projects }] = await Promise.all([
    supabase
      .from("letters")
      .select("id, ref, recipient, subject, date_letter, pdf_status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = letters ?? [];
  const readyCount = rows.filter((l) => l.pdf_status === "READY").length;
  const recipientCount = new Set(rows.map((l) => l.recipient).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New letter" description="Add a correspondence record.">
        <AddLetterForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Letters"
              description="Office correspondence register."
              actions={<ContextPanelTrigger size="sm">Add letter</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total letters" value={rows.length} />
              <KpiTile label="PDF ready" value={readyCount} />
              <KpiTile label="Recipients" value={recipientCount} />
            </div>

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
                          <GeneratePdfButton action={generateLetterPdf.bind(null, l.id)} pdfStatus={l.pdf_status} />
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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
