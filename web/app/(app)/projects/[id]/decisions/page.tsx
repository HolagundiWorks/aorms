import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { NewDecisionForm } from "../../../../../components/aorms/NewDecisionForm";
import { DecisionStateSelect } from "../../../../../components/aorms/DecisionStateSelect";
import { DECISION_STATE_TAG, type DecisionState } from "../../../../../lib/decisions";

export default async function ProjectDecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: decisions, error: decisionsError }] = await Promise.all([
    supabase.from("project_offices").select("id, ref, title").eq("id", id).maybeSingle(),
    supabase
      .from("decisions")
      .select("id, title, rationale, state, revision_category, revision_source, impact, owner_name, review_deadline")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
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

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Decisions (CRIF)
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          The Critical Revision Information Flow register — every design decision and revision
          worth tracking, moved through Draft → Open → Client review → Accepted/Rejected → Locked.
          Sending a decision to &quot;Client review&quot; makes it visible on the client&apos;s
          portal, where they respond directly.
        </p>

        <NewDecisionForm projectId={project.id} />

        {decisionsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load decisions: {decisionsError.message}
          </p>
        ) : (
          <Table aria-label="Decisions" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Category / Source</TableHeader>
                <TableHeader>Impact</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Deadline</TableHeader>
                <TableHeader>State</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(decisions ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>{d.title}</div>
                    <div className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {d.rationale}
                    </div>
                  </TableCell>
                  <TableCell>
                    {d.revision_category ? `${d.revision_category}` : "—"}
                    {d.revision_source ? ` / ${d.revision_source.replace(/_/g, " ")}` : ""}
                  </TableCell>
                  <TableCell>
                    <Tag type={d.impact === "HIGH" ? "red" : d.impact === "MEDIUM" ? "purple" : "gray"} size="sm">
                      {d.impact}
                    </Tag>
                  </TableCell>
                  <TableCell>{d.owner_name ?? "—"}</TableCell>
                  <TableCell>{d.review_deadline ?? "—"}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Tag type={DECISION_STATE_TAG[d.state as DecisionState]} size="sm">
                        {d.state}
                      </Tag>
                      <DecisionStateSelect projectId={project.id} decisionId={d.id} state={d.state} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(decisions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No decisions logged yet.
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
