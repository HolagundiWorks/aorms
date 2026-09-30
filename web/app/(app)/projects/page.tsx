import { cookies } from "next/headers";
import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddProjectForm } from "../../../components/aorms/AddProjectForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { BigStat } from "../../../components/aorms/BigStat";
import { ProjectsBrowser, VIEW_COOKIE, type ProjectsView } from "../../../components/aorms/ProjectsBrowser";
import { signCoverUrls } from "../../../lib/projects/covers";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Same set as app/(app)/clients/page.tsx's and app/(app)/contractors/page.tsx's
// own WRITE_TIER_ROLES (mirrored from lib/actions/clients.ts) — gates the
// "Create project" trigger the same way Clients/Contractors now do (found
// by live QA 2026-09-21: this page never gated its write UI at all, the
// same class of bug 0082/0083 fixed for clients/contractors). The real
// authorization boundary is the RLS/Server Action fix in
// lib/actions/projects.ts and migration
// 0084_project_offices_write_requires_capability.sql — this is the
// matching defense-in-depth UI fix.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await searchParams;
  // ?view= wins (and keeps the old ?view=schedule link working); otherwise the
  // cookie the browser component writes; otherwise cards.
  const cookieView = (await cookies()).get(VIEW_COOKIE)?.value;
  const initialView: ProjectsView =
    viewParam === "lines" || viewParam === "schedule" ? "lines" : viewParam === "cards" ? "cards" : cookieView === "lines" ? "lines" : "cards";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projects, error }, { data: clients }, { data: myProfile }, { data: taskRows }, { data: pinRows }] = await Promise.all([
    supabase
      .from("project_offices")
      .select("id, ref, title, project_type, work_type, status, city, client_id, built_up_area_sqm, site_area_sqm, floor_count, cover_image_key, clients(name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("tasks").select("project_id, status").not("project_id", "is", null),
    supabase.from("project_pins").select("project_id"),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = projects ?? [];
  const activeCount = rows.filter((p) => p.status === "ACTIVE").length;
  const enquiryCount = rows.filter((p) => p.status === "ENQUIRY").length;

  // Per-project task progress for the board cards.
  const taskTally = new Map<string, { done: number; total: number }>();
  for (const t of taskRows ?? []) {
    if (!t.project_id) continue;
    const c = taskTally.get(t.project_id) ?? { done: 0, total: 0 };
    c.total += 1;
    if (t.status === "DONE") c.done += 1;
    taskTally.set(t.project_id, c);
  }
  const pinnedIds = new Set((pinRows ?? []).map((r) => r.project_id));
  // Signed URLs only for covers the RLS-scoped query above already returned.
  const coverUrls = await signCoverUrls(rows.map((p) => p.cover_image_key));
  const clientNameOf = (p: (typeof rows)[number]) =>
    (Array.isArray(p.clients) ? p.clients[0]?.name : (p.clients as { name: string } | null)?.name) ?? null;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="Create project" description="Start a new project office.">
          <AddProjectForm clients={clients ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Projects"
          result="A coordinated project record."
          description="Project offices — phases, tasks, and delivery live under each project."
          actions={canWrite ? <ContextPanelTrigger size="sm">Create project</ContextPanelTrigger> : undefined}
        />

        <div className="aorms-bigstat-row">
          <BigStat value={rows.length} label="Projects" />
          <BigStat value={activeCount} label="Active" active />
          <BigStat value={enquiryCount} label="Enquiry" />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load projects: {error.message}
          </p>
        ) : (
          <ProjectsBrowser
            initialView={initialView}
            projects={rows.map((p) => ({
              id: p.id,
              ref: p.ref,
              title: p.title,
              status: p.status,
              clientName: clientNameOf(p),
              city: p.city,
              projectType: p.project_type,
              builtUpSqm: p.built_up_area_sqm,
              siteSqm: p.site_area_sqm,
              floors: p.floor_count,
              tasksDone: taskTally.get(p.id)?.done ?? 0,
              tasksTotal: taskTally.get(p.id)?.total ?? 0,
              coverUrl: p.cover_image_key ? (coverUrls.get(p.cover_image_key) ?? null) : null,
              pinned: pinnedIds.has(p.id),
            }))}
          />
        )}
      </Column>
      </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
