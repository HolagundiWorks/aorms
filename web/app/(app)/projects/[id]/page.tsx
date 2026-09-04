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
  Tag,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewPhaseForm } from "../../../../components/aorms/NewPhaseForm";

const STATUS_TAG: Record<string, "green" | "blue" | "gray" | "purple" | "teal"> = {
  ENQUIRY: "gray",
  PROPOSAL: "purple",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "teal",
  ARCHIVED: "gray",
};

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
          <Tag type={STATUS_TAG[project.status] ?? "gray"} size="sm">
            {project.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {clientName ?? "No client"} · {project.project_type} · {project.work_type}
            {project.city ? ` · ${project.city}` : ""}
          </span>
        </div>

        <p style={{ marginBottom: "2rem" }}>
          <Link href={`/projects/${project.id}/cpi`}>Client–Project Intelligence (CPI) →</Link>
        </p>

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
