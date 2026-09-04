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
import { NewTaskForm } from "../../../components/aorms/NewTaskForm";

const STATUS_TAG: Record<string, "gray" | "blue" | "red" | "green"> = {
  TODO: "gray",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  DONE: "green",
};

const PRIORITY_TAG: Record<string, "gray" | "blue" | "magenta" | "red"> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "magenta",
  CRITICAL: "red",
};

export default async function TasksPage() {
  const supabase = await createClient();

  const [
    { data: tasks, error },
    { data: projects },
    { data: assignees },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_date, classification, work_type, project_offices(title), profiles!tasks_assignee_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Tasks</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Office-wide task list across all projects.
        </p>

        <NewTaskForm projects={projects ?? []} assignees={assignees ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load tasks: {error.message}
          </p>
        ) : (
          <Table aria-label="Tasks" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Assignee</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Due</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tasks ?? []).map((t) => {
                const project = Array.isArray(t.project_offices)
                  ? t.project_offices[0]
                  : (t.project_offices as { title: string } | null);
                const assignee = Array.isArray(t.profiles)
                  ? t.profiles[0]
                  : (t.profiles as { full_name: string | null } | null);
                return (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{assignee?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[t.status] ?? "gray"} size="sm">
                        {t.status}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Tag type={PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                        {t.priority}
                      </Tag>
                    </TableCell>
                    <TableCell>{t.due_date ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {(tasks ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No tasks yet.
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
