import Link from "next/link";
import { Column, Grid, Tile } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { LibraryManager } from "../../../../components/aorms/tasks/LibraryManager";
import { GenerateTasksPanel } from "../../../../components/aorms/tasks/GenerateTasksPanel";
import { todayISO } from "../../../../lib/tasks/dates";
import type { TaskTemplate } from "../../../../lib/tasks/estimate";

const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function TaskLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows, error }, { data: projects }, { data: assignees }, { data: me }] = await Promise.all([
    supabase.from("task_templates").select("*").order("sequence").order("title"),
    supabase.from("project_offices").select("id, title, built_up_area_sqm, site_area_sqm, floor_count").is("archived_at", null).order("title"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!me && WRITE_TIER_ROLES.has(me.role);

  const templates: TaskTemplate[] = (rows ?? []).map((t) => ({
    ...t,
    base_hours: Number(t.base_hours),
    hours_per_100sqm: Number(t.hours_per_100sqm),
    min_hours: t.min_hours == null ? null : Number(t.min_hours),
    max_hours: t.max_hours == null ? null : Number(t.max_hours),
  }));

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow="Tasks"
          title="Task library"
          description="Reusable tasks whose timelines scale with the project — a floor's working drawings take longer the bigger its area."
        />
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem" }}>
          <Link href="/tasks">← Back to the task board</Link>
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load the library: {error.message}. Has migration 0088 been applied?
          </p>
        ) : (
          <div style={{ display: "grid", gap: "2rem" }}>
            <LibraryManager templates={templates} canWrite={canWrite} />
            {canWrite && templates.length > 0 && (
              <Tile>
                <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>Generate tasks for a project</h2>
                <GenerateTasksPanel
                  templates={templates}
                  projects={projects ?? []}
                  assignees={assignees ?? []}
                  today={todayISO()}
                />
              </Tile>
            )}
          </div>
        )}
      </Column>
    </Grid>
  );
}
