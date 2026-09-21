import { Book, Category } from "@carbon/icons-react";
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
import { AddLessonForm } from "../../../components/aorms/AddLessonForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's
// "lessons_learned: staff write" policy). Gates the "Add lesson" trigger
// the same way Clients/Contractors/Projects already gate their own create
// triggers — found missing here by a 2026-09-21 sweep of every
// /app/(app)/*/page.tsx with an unguarded ContextPanelTrigger after the
// same class of bug was confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function LessonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: lessons, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("lessons_learned")
      .select("id, title, category, status, author_name, created_at, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = lessons ?? [];
  const categoryCount = new Set(rows.map((l) => l.category).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New lesson" description="Capture a lesson learned.">
          <AddLessonForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Lessons Learned"
              description="Firm-wide knowledge captured per project."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add lesson</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total lessons" value={rows.length} icon={Book} />
              <KpiTile label="Categories" value={categoryCount} icon={Category} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load lessons: {error.message}
              </p>
            ) : (
              <Table aria-label="Lessons learned" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Author</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(lessons ?? []).map((l) => {
                    const project = Array.isArray(l.project_offices)
                      ? l.project_offices[0]
                      : (l.project_offices as { title: string } | null);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{l.title}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>
                          <Tag type="blue" size="sm">
                            {l.category}
                          </Tag>
                        </TableCell>
                        <TableCell>{l.author_name ?? "—"}</TableCell>
                        <TableCell>{l.status}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(lessons ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No lessons captured yet.
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
