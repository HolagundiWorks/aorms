import { Document, Edit } from "@carbon/icons-react";
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
import { AddSpecSheetForm } from "../../../components/aorms/AddSpecSheetForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's
// "spec_sheets: staff write" policy). Gates the "Add spec sheet" trigger
// the same way Clients/Contractors/Projects already gate their own create
// triggers — found missing here by a 2026-09-21 sweep of every
// /app/(app)/*/page.tsx with an unguarded ContextPanelTrigger after the
// same class of bug was confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function SpecSheetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: sheets, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("spec_sheets")
      .select("id, ref, title, status, version_no, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = sheets ?? [];
  const draftCount = rows.filter((s) => s.status === "DRAFT").length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New spec sheet" description="Add a project material specification document.">
          <AddSpecSheetForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Spec Sheets"
              description="Per-project material specification documents."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add spec sheet</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total spec sheets" value={rows.length} icon={Document} />
              <KpiTile label="Draft" value={draftCount} icon={Edit} />
            </div>

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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
