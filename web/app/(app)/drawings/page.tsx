import { CheckmarkFilled, Draw, Time, WarningFilled } from "@carbon/icons-react";
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

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's "drawings:
// staff write" policy). Gates the "Add drawing" trigger the same way
// Clients/Contractors/Projects already gate their own create triggers —
// found missing here by a 2026-09-21 sweep of every /app/(app)/*/page.tsx
// with an unguarded ContextPanelTrigger after the same class of bug was
// confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function DrawingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: drawings, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("drawings")
      .select(
        "id, ref, title, file_name, status, error_text, svg_key, issue_pdf_status, review_status, rev_no, project_offices(title)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = drawings ?? [];
  const readyCount = rows.filter((d) => d.status === "READY").length;
  const failedCount = rows.filter((d) => d.status === "FAILED").length;
  const pendingReviewCount = rows.filter((d) => d.review_status === "PENDING_REVIEW").length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="Add drawing" description="Upload a DXF drawing.">
          <AddDrawingForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Drawings"
              description="DXF register with worker-driven takeoff and revision chaining."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add drawing</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total drawings" value={rows.length} icon={Draw} />
              <KpiTile label="Ready" value={readyCount} icon={CheckmarkFilled} />
              <KpiTile label="Failed" value={failedCount} icon={WarningFilled} />
              <KpiTile label="Pending review" value={pendingReviewCount} icon={Time} />
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
