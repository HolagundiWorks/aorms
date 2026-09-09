import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { AddPhaseForm } from "../../../../components/aorms/AddPhaseForm";
import { ProjectStatusSelect } from "../../../../components/aorms/ProjectStatusSelect";
import { ActivationGate } from "../../../../components/aorms/ActivationGate";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { KpiTile } from "../../../../components/aorms/KpiTile";
import { getActivationGate } from "../../../../lib/actions/activation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project, error: projectError },
    { data: phases, error: phasesError },
    { count: openTaskCount },
    { data: decisionStates },
  ] = await Promise.all([
    supabase
      .from("project_offices")
      .select("id, ref, title, project_type, work_type, status, city, clients(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("phases")
      .select("id, code, label, billing_pct, sort_order, revision_budget")
      .eq("project_id", id)
      .order("sort_order"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id).neq("status", "DONE"),
    supabase.from("decisions").select("state").eq("project_id", id),
  ]);

  if (projectError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!project) notFound();

  const clientName = Array.isArray(project.clients)
    ? project.clients[0]?.name
    : (project.clients as { name: string } | null)?.name;

  const gate = await getActivationGate(project.id);
  const decisionsAwaitingClient = (decisionStates ?? []).filter((d) => d.state === "CLIENT_REVIEW").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add phase" description="Add a delivery phase to this project.">
        <AddPhaseForm projectId={project.id} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              eyebrow={project.ref}
              eyebrowMono
              title={project.title}
              description={
                <>
                  {clientName ?? "No client"} · {project.project_type} · {project.work_type}
                  {project.city ? ` · ${project.city}` : ""}
                </>
              }
              actions={<ProjectStatusSelect projectId={project.id} status={project.status} />}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Phases" value={(phases ?? []).length} />
              <KpiTile label="Open tasks" value={openTaskCount ?? 0} />
              <KpiTile label="Decisions logged" value={(decisionStates ?? []).length} />
              <KpiTile label="Awaiting client" value={decisionsAwaitingClient} />
            </div>

            {project.status !== "ACTIVE" && project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
              <>
                <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Activation gate
                </h2>
                <div style={{ marginBottom: "2rem" }}>
                  <ActivationGate projectId={project.id} gate={gate} />
                </div>
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 className="cds--type-heading-02">Phases</h2>
              <ContextPanelTrigger size="sm">Add phase</ContextPanelTrigger>
            </div>

            {phasesError ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load phases: {phasesError.message}
              </p>
            ) : (
              <Table aria-label="Phases" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>Billing %</TableHeader>
                    <TableHeader>Order</TableHeader>
                    <TableHeader>Revision budget</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(phases ?? []).map((ph) => (
                    <TableRow key={ph.id}>
                      <TableCell>{ph.code}</TableCell>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billing_pct}%</TableCell>
                      <TableCell>{ph.sort_order}</TableCell>
                      <TableCell>{ph.revision_budget ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(phases ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No phases yet.
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
