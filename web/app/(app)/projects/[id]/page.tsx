import Link from "next/link";
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
import { NewPhaseForm } from "../../../../components/aorms/NewPhaseForm";
import { ProjectStatusSelect } from "../../../../components/aorms/ProjectStatusSelect";
import { ActivationGate } from "../../../../components/aorms/ActivationGate";
import { getActivationGate } from "../../../../lib/actions/activation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: phases, error: phasesError }] =
    await Promise.all([
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
    ]);

  if (projectError) {
    return (
      <Grid style={{ padding: "2rem" }}>
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

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p
          className="cds--type-body-01"
          style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
        >
          {project.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {project.title}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <ProjectStatusSelect projectId={project.id} status={project.status} />
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {clientName ?? "No client"} · {project.project_type} · {project.work_type}
            {project.city ? ` · ${project.city}` : ""}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <Link href={`/projects/${project.id}/cpi`}>Client–Project Intelligence (CPI) →</Link>
          <Link href={`/projects/${project.id}/dna`}>Project DNA →</Link>
          <Link href={`/projects/${project.id}/assessment`}>Pre-Project Assessment →</Link>
          <Link href={`/projects/${project.id}/feasibility`}>Feasibility Reports →</Link>
          <Link href={`/projects/${project.id}/negotiation`}>Negotiation →</Link>
          <Link href={`/projects/${project.id}/program`}>Program →</Link>
          <Link href={`/projects/${project.id}/onboarding`}>Client Onboarding →</Link>
          <Link href={`/projects/${project.id}/precon`}>Pre-Construction R&amp;O →</Link>
        </div>

        {project.status !== "ACTIVE" && project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
              Activation gate
            </h2>
            <div style={{ marginBottom: "2rem" }}>
              <ActivationGate projectId={project.id} gate={gate} />
            </div>
          </>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Phases
        </h2>

        <NewPhaseForm projectId={project.id} />

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
  );
}
