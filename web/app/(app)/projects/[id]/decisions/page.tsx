import { Locked, Task, Time, WarningFilled } from "@carbon/icons-react";
import { notFound } from "next/navigation";
import { Accordion, AccordionItem, Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { AddDecisionForm } from "../../../../../components/aorms/AddDecisionForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../../../components/aorms/ContextPanel";
import { DecisionProgress } from "../../../../../components/aorms/DecisionProgress";
import { DecisionStateDropdown } from "../../../../../components/aorms/DecisionStateDropdown";
import { KpiTile } from "../../../../../components/aorms/KpiTile";
import { PageHeader } from "../../../../../components/aorms/PageHeader";
import type { DecisionState } from "../../../../../lib/decisions";

function formatCostDelta(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "+";
  return `${sign}₹${rupees.toLocaleString("en-IN")}`;
}

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's "decisions:
// staff write" policy). Gates the "Add decision" trigger the same way
// Clients/Contractors/Projects already gate their own create triggers —
// found missing here by a 2026-09-21 sweep of every /app/(app)/*/page.tsx
// with an unguarded ContextPanelTrigger after the same class of bug was
// confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function ProjectDecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: project, error: projectError },
    { data: decisions, error: decisionsError },
    { data: myProfile },
  ] = await Promise.all([
    supabase.from("project_offices").select("id, ref, title").eq("id", id).maybeSingle(),
    supabase
      .from("decisions")
      .select("id, title, rationale, state, revision_category, revision_source, impact, owner_name, review_deadline, cost_delta_paise")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

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
    // AORMS's own form-panel pattern (Composition Standard §13-30): the
    // "Add decision" panel opens left of this content, not over it — the
    // register below stays visible and interactive the whole time.
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="Add decision" description="Log a new CRIF decision or revision.">
          <AddDecisionForm projectId={project.id} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              eyebrow={project.title}
              title="Decisions (CRIF)"
              description={
                <>
                  The Critical Revision Information Flow register — every design decision and revision worth
                  tracking, moved through Draft → Open → Client review → Accepted/Rejected → Locked. Sending a
                  decision to &quot;Client review&quot; makes it visible on the client&apos;s portal, where they
                  respond directly.
                </>
              }
            />

            {/* Page-overview-in-numbers row, directly under the title/description
                rather than buried at the bottom of a table. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total decisions" value={rows.length} icon={Task} />
              <KpiTile label="Awaiting client" value={inReviewCount} icon={Time} />
              <KpiTile label="High impact" value={highImpactCount} icon={WarningFilled} />
              <KpiTile label="Locked" value={lockedCount} icon={Locked} />
            </div>

            {canWrite && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <ContextPanelTrigger size="sm">Add decision</ContextPanelTrigger>
              </div>
            )}

            {decisionsError ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load decisions: {decisionsError.message}
              </p>
            ) : rows.length === 0 ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No decisions logged yet.
              </p>
            ) : (
              <Accordion align="start">
                {rows.map((d) => (
                  <AccordionItem
                    key={d.id}
                    title={
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
                        <span className="cds--type-body-01">{d.title}</span>
                        <span style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                          <Tag type={d.impact === "HIGH" ? "red" : d.impact === "MEDIUM" ? "purple" : "gray"} size="sm">
                            {d.impact}
                          </Tag>
                          <Tag type="cool-gray" size="sm">
                            {d.state}
                          </Tag>
                        </span>
                      </div>
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "40rem" }}>
                      <p className="cds--type-body-01">{d.rationale}</p>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "1rem" }}>
                        <div>
                          <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                            Category / source
                          </p>
                          <p className="cds--type-body-01">
                            {d.revision_category ?? "—"}
                            {d.revision_source ? ` / ${d.revision_source.replace(/_/g, " ")}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                            Owner
                          </p>
                          <p className="cds--type-body-01">{d.owner_name ?? "—"}</p>
                        </div>
                        <div>
                          <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                            Review deadline
                          </p>
                          <p className="cds--type-body-01">{d.review_deadline ?? "—"}</p>
                        </div>
                        {d.cost_delta_paise != null && (
                          <div>
                            <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                              Cost delta on this revision
                            </p>
                            <p
                              className="cds--type-body-01"
                              style={{ color: d.cost_delta_paise < 0 ? "var(--cds-support-success)" : "var(--cds-support-warning)" }}
                            >
                              {formatCostDelta(d.cost_delta_paise)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
                          Progress
                        </p>
                        <DecisionProgress state={d.state as DecisionState} />
                      </div>

                      <div style={{ maxWidth: "16rem" }}>
                        <DecisionStateDropdown projectId={project.id} decisionId={d.id} state={d.state} />
                      </div>
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
