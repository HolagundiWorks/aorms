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
import { AddDrawingForm } from "../../../components/aorms/AddDrawingForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateDrawingIssuePdf } from "../../../lib/actions/drawings";

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
      .select(
        "id, ref, title, file_name, status, error_text, svg_key, issue_pdf_status, review_status, rev_no, project_offices(title)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = drawings ?? [];
  const readyCount = rows.filter((d) => d.status === "READY").length;
  const failedCount = rows.filter((d) => d.status === "FAILED").length;
  const pendingReviewCount = rows.filter((d) => d.review_status === "PENDING_REVIEW").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add drawing" description="Upload a DXF drawing.">
        <AddDrawingForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Drawings"
              description="DXF register with worker-driven takeoff and revision chaining."
              actions={<ContextPanelTrigger size="sm">Add drawing</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total drawings" value={rows.length} />
              <KpiTile label="Ready" value={readyCount} />
              <KpiTile label="Failed" value={failedCount} />
              <KpiTile label="Pending review" value={pendingReviewCount} />
            </div>

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
                    <TableHeader>Issue-set PDF</TableHeader>
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
                          {d.status === "FAILED" && d.error_text && (
                            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)", marginTop: "0.25rem" }}>
                              {d.error_text}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <GeneratePdfButton
                            action={generateDrawingIssuePdf.bind(null, d.id)}
                            pdfStatus={d.issue_pdf_status}
                            label="Generate issue-set PDF"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(drawings ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
