import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { AddDecisionButton } from "../../../../../components/aorms/AddDecisionButton";
import { DecisionStateSelect } from "../../../../../components/aorms/DecisionStateSelect";
import { KpiTile } from "../../../../../components/aorms/KpiTile";
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

  const rows = decisions ?? [];
  const inReviewCount = rows.filter((d) => d.state === "CLIENT_REVIEW").length;
  const highImpactCount = rows.filter((d) => d.impact === "HIGH").length;
  const lockedCount = rows.filter((d) => d.state === "LOCKED").length;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.2rem" }}>
          {project.title}
        </p>
        {/* Page title one step down from heading-05 (32px) to heading-04
            (28px) and tighter margins — the previous scale read as
            disconnected from the caption above and the description below
            it rather than as one hierarchy (2026-09-09 layout pass). */}
        <h1 className="cds--type-heading-04" style={{ marginBottom: "0.5rem" }}>
          Decisions (CRIF)
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)", maxWidth: "42rem" }}>
          The Critical Revision Information Flow register — every design decision and revision
          worth tracking, moved through Draft → Open → Client review → Accepted/Rejected → Locked.
          Sending a decision to &quot;Client review&quot; makes it visible on the client&apos;s
          portal, where they respond directly.
        </p>

        {/* Page-overview-in-numbers row, directly under the title/description
            rather than buried at the bottom of a table — same KpiTile used
            on /dashboard. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total decisions" value={rows.length} />
          <KpiTile label="Awaiting client" value={inReviewCount} />
          <KpiTile label="High impact" value={highImpactCount} />
          <KpiTile label="Locked" value={lockedCount} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <AddDecisionButton projectId={project.id} />
        </div>

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
              {rows.map((d) => (
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
              {rows.length === 0 && (
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
