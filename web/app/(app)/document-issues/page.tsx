import { Calendar, DocumentMultiple_02, WarningAlt } from "@carbon/icons-react";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddDocumentIssueForm } from "../../../components/aorms/AddDocumentIssueForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
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
// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's
// "document_issues: staff insert" policy). Gates the "Log issue" trigger
// the same way Clients/Contractors/Projects already gate their own create
// triggers — found missing here by a 2026-09-21 sweep of every
// /app/(app)/*/page.tsx with an unguarded ContextPanelTrigger after the
// same class of bug was confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function DocumentIssuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: issues, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("document_issues")
      .select("id, entity_type, ref, version_no, revision_note, impact_note, issued_at, project_offices(title)")
      .order("issued_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = issues ?? [];
  const entityTypeCount = new Set(rows.map((i) => i.entity_type)).size;
  const thisMonthCount = rows.filter((i) => {
    if (!i.issued_at) return false;
    const issued = new Date(i.issued_at);
    const now = new Date();
    return issued.getUTCFullYear() === now.getUTCFullYear() && issued.getUTCMonth() === now.getUTCMonth();
  }).length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="Log document issue" description="Record a cross-entity revision/issue.">
          <AddDocumentIssueForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Document Issues"
              description="Cross-entity revision/issue register — drawings, transmittals, invoices, and every other issued document, in one place."
              actions={canWrite ? <ContextPanelTrigger size="sm">Log issue</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total issues" value={rows.length} icon={WarningAlt} />
              <KpiTile label="This month" value={thisMonthCount} icon={Calendar} />
              <KpiTile label="Document types" value={entityTypeCount} icon={DocumentMultiple_02} />
            </div>

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
