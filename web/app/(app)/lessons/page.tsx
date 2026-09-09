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

export default async function LessonsPage() {
  const supabase = await createClient();

  const [{ data: lessons, error }, { data: projects }] = await Promise.all([
    supabase
      .from("lessons_learned")
      .select("id, title, category, status, author_name, created_at, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = lessons ?? [];
  const categoryCount = new Set(rows.map((l) => l.category).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New lesson" description="Capture a lesson learned.">
        <AddLessonForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Lessons Learned"
              description="Firm-wide knowledge captured per project."
              actions={<ContextPanelTrigger size="sm">Add lesson</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total lessons" value={rows.length} />
              <KpiTile label="Categories" value={categoryCount} />
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
