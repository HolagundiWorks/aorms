import { CheckmarkFilled, InProgress, ListChecked, LockedAndBlocked } from "@carbon/icons-react";
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
import { AddTaskForm } from "../../../components/aorms/AddTaskForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { bandForScore, PRIORITY_BAND_LABEL, type PriorityBand } from "../../../lib/pulse/scoring";
import { MarkTaskDoneButton } from "../../../components/aorms/dashboard/QueueActions";

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

const BAND_TAG: Record<PriorityBand, "red" | "magenta" | "purple" | "blue" | "gray"> = {
  CRITICAL: "red",
  ACTION_TODAY: "magenta",
  WATCH: "purple",
  NORMAL: "blue",
  BACKLOG: "gray",
};

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and web/lib/actions/tasks.ts's own copy of this set). Gates the "Add
// task" trigger the same way Clients/Contractors/Projects already gate
// their own create triggers — found missing here by live QA 2026-09-21
// (a VIEWER saw a fully-interactive "Add task" button/form; the RLS
// write policy already blocks the underlying INSERT, this is the
// matching UI-level fix).
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks, error },
    { data: projects },
    { data: assignees },
    { data: myProfile },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, priority_score, due_date, classification, work_type, project_offices(title), profiles!tasks_assignee_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = tasks ?? [];
  const inProgressCount = rows.filter((t) => t.status === "IN_PROGRESS").length;
  const blockedCount = rows.filter((t) => t.status === "BLOCKED").length;
  const doneCount = rows.filter((t) => t.status === "DONE").length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New task" description="Add a task to the office-wide list.">
          <AddTaskForm projects={projects ?? []} assignees={assignees ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Tasks"
              description="Office-wide task list across all projects."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add task</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total tasks" value={rows.length} icon={ListChecked} />
              <KpiTile label="In progress" value={inProgressCount} icon={InProgress} />
              <KpiTile label="Blocked" value={blockedCount} icon={LockedAndBlocked} />
              <KpiTile label="Done" value={doneCount} icon={CheckmarkFilled} />
            </div>

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
                    <TableHeader>Pulse</TableHeader>
                    <TableHeader>Due</TableHeader>
                    <TableHeader>Actions</TableHeader>
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
                        <TableCell>
                          {/* Pulse's own computed band (lib/pulse/scoring.ts) —
                              a task not yet swept by a recompute pass has
                              priority_score at its column default (0), which
                              isn't a real BACKLOG verdict, just "not scored
                              yet"; shown as a dash rather than a misleading
                              band tag. */}
                          {t.status !== "DONE" && t.priority_score ? (
                            <Tag type={BAND_TAG[bandForScore(t.priority_score)]} size="sm">
                              {PRIORITY_BAND_LABEL[bandForScore(t.priority_score)]}
                            </Tag>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{t.due_date ?? "—"}</TableCell>
                        <TableCell>
                          {/* Same MarkTaskDoneButton the Pulse "Next up" widget
                              uses (components/aorms/dashboard/QueueActions.tsx
                              -> lib/actions/tasks.ts's updateTaskStatus, which
                              already revalidates both /pulse and /tasks) — QA
                              found /tasks had no way to mark a task done at
                              all, only Pulse did. */}
                          {t.status !== "DONE" ? <MarkTaskDoneButton taskId={t.id} /> : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(tasks ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
