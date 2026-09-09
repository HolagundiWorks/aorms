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
import { AddSiteInstructionForm } from "../../../components/aorms/AddSiteInstructionForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateSiteInstructionPdf } from "../../../lib/actions/site-instructions";

export default async function SiteInstructionsPage() {
  const supabase = await createClient();

  const [{ data: instructions, error }, { data: projects }, { data: contractors }] = await Promise.all([
    supabase
      .from("site_instructions")
      .select("id, ref, subject, issued_at, acknowledged_at, pdf_status, project_offices(title), contractors(name)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("contractors").select("id, name").order("name"),
  ]);

  const rows = instructions ?? [];
  const acknowledgedCount = rows.filter((s) => s.acknowledged_at).length;
  const pendingCount = rows.length - acknowledgedCount;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New site instruction" description="Issue a formal instruction to a contractor.">
        <AddSiteInstructionForm projects={projects ?? []} contractors={contractors ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Site Instructions"
              description="Formal instructions issued to contractors on site."
              actions={<ContextPanelTrigger size="sm">Issue instruction</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total instructions" value={rows.length} />
              <KpiTile label="Acknowledged" value={acknowledgedCount} />
              <KpiTile label="Pending" value={pendingCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load instructions: {error.message}
              </p>
            ) : (
              <Table aria-label="Site instructions" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Contractor</TableHeader>
                    <TableHeader>Subject</TableHeader>
                    <TableHeader>Issued</TableHeader>
                    <TableHeader>Acknowledged</TableHeader>
                    <TableHeader>PDF</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(instructions ?? []).map((s) => {
                    const project = Array.isArray(s.project_offices) ? s.project_offices[0] : (s.project_offices as { title: string } | null);
                    const contractor = Array.isArray(s.contractors) ? s.contractors[0] : (s.contractors as { name: string } | null);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{s.ref}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{contractor?.name ?? "—"}</TableCell>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>{s.issued_at ?? "—"}</TableCell>
                        <TableCell>{s.acknowledged_at ? new Date(s.acknowledged_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                        <TableCell>
                          <GeneratePdfButton
                            action={generateSiteInstructionPdf.bind(null, s.id)}
                            pdfStatus={s.pdf_status}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(instructions ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No instructions issued yet.
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
