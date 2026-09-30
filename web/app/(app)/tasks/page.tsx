import { CheckmarkFilled, InProgress, ListChecked, LockedAndBlocked } from "@carbon/icons-react";
import { Button, Column, Grid } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddTaskForm } from "../../../components/aorms/AddTaskForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { TaskBoard } from "../../../components/aorms/tasks/TaskBoard";
import { todayISO } from "../../../lib/tasks/dates";
import { filtersFromParams } from "../../../lib/tasks/filter";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and web/lib/actions/tasks.ts's own copy of this set). Gates the "Add
// task" trigger the same way Clients/Contractors/Projects already gate
// their own create triggers — found missing here by live QA 2026-09-21
// (a VIEWER saw a fully-interactive "Add task" button/form; the RLS
// write policy already blocks the underlying INSERT, this is the
// matching UI-level fix).
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const first = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
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
        "id, title, status, priority, due_date, estimated_hours, assignee_id, project_id, created_at, floor_label, depends_on_id, project_offices(title)",
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
              description="Drag tasks between columns, drop people onto tasks to assign, and drag deadlines on the calendar."
              actions={
                <>
                  <Button href="/tasks/library" kind="tertiary" size="sm">Task library</Button>
                  {canWrite && <ContextPanelTrigger size="sm">Add task</ContextPanelTrigger>}
                </>
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 9rem)",
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
              <TaskBoard
                initialTasks={rows.map((t) => {
                  const project = Array.isArray(t.project_offices)
                    ? t.project_offices[0]
                    : (t.project_offices as { title: string } | null);
                  return {
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    due_date: t.due_date,
                    estimated_hours: t.estimated_hours == null ? null : Number(t.estimated_hours),
                    assignee_id: t.assignee_id,
                    project_title: project?.title ?? null,
                    floor_label: t.floor_label,
                    depends_on_id: t.depends_on_id,
                    project_id: t.project_id,
                    created_at: t.created_at,
                  };
                })}
                people={(assignees ?? []).map((a) => ({ id: a.id, name: a.full_name ?? "Unnamed" }))}
                projects={projects ?? []}
                currentUserId={user?.id ?? null}
                initialFilters={filtersFromParams(first)}
                canWrite={canWrite}
                today={todayISO()}
              />
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
