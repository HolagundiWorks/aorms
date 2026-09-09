import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddDocumentIssueForm } from "../../../components/aorms/AddDocumentIssueForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../components/aorms/PageHeader";

/**
 * Document Issues register — Phase 4's own flagged gap ("document_issues
 * ... the cross-entity register — audit's own landing order puts it last,
 * fans in across every other domain"). Append-only (RLS has no update/
 * delete policy, like `audit_log`) — a manual "log an issue" entry point,
 * not automatic wiring from every issuing action across the app (that's a
 * genuinely cross-cutting change, flagged not attempted — see
 * lib/actions/document-issues.ts's header comment).
 */
export default async function DocumentIssuesPage() {
  const supabase = await createClient();

  const [{ data: issues, error }, { data: projects }] = await Promise.all([
    supabase
      .from("document_issues")
      .select("id, entity_type, ref, version_no, revision_note, impact_note, issued_at, project_offices(title)")
      .order("issued_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <ContextPanelLayout>
      <ContextPanel title="Log document issue" description="Record a cross-entity revision/issue.">
        <AddDocumentIssueForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Document Issues"
              description="Cross-entity revision/issue register — drawings, transmittals, invoices, and every other issued document, in one place."
              actions={<ContextPanelTrigger size="sm">Log issue</ContextPanelTrigger>}
            />

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load document issues: {error.message}
              </p>
            ) : (
              <Table aria-label="Document issues" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Version</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Revision note</TableHeader>
                    <TableHeader>Issued</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(issues ?? []).map((iss) => {
                    const project = Array.isArray(iss.project_offices)
                      ? iss.project_offices[0]
                      : (iss.project_offices as { title: string } | null);
                    return (
                      <TableRow key={iss.id}>
                        <TableCell>
                          <Tag type="outline" size="sm">
                            {iss.entity_type}
                          </Tag>
                        </TableCell>
                        <TableCell>{iss.ref}</TableCell>
                        <TableCell>{iss.version_no}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{iss.revision_note ?? "—"}</TableCell>
                        <TableCell>{iss.issued_at ? new Date(iss.issued_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(issues ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No document issues logged yet.
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
