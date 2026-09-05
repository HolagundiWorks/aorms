import { notFound } from "next/navigation";
import { Column, Grid, Tag, Tile } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { ProjectDnaForm } from "../../../../../components/aorms/ProjectDnaForm";
import {
  computeRiskScore,
  RISK_BAND_LABEL,
  RISK_BAND_TAG,
  type BudgetMode,
  type DecisionMakers,
  type DesignFlexibility,
  type RevisionTolerance,
  type TimelineCriticality,
  type VastuRequirement,
} from "../../../../../lib/project-os";

export default async function ProjectDnaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: dna }] = await Promise.all([
    supabase.from("project_offices").select("id, title, jurisdiction").eq("id", id).maybeSingle(),
    supabase.from("project_dnas").select("*").eq("project_id", id).maybeSingle(),
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

  // No DNA yet is a normal empty state, not an error — hide the risk badge
  // instead of showing one, matching the original router's own comment.
  const riskScore = dna
    ? computeRiskScore({
        budgetMode: dna.budget_mode as BudgetMode,
        vastuRequirement: dna.vastu_requirement as VastuRequirement,
        designFlexibility: dna.design_flexibility as DesignFlexibility,
        decisionMakers: dna.decision_makers as DecisionMakers,
        timelineCriticality: dna.timeline_criticality as TimelineCriticality,
        revisionTolerance: dna.revision_tolerance as RevisionTolerance,
        jurisdiction: project.jurisdiction,
      })
    : null;

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Project DNA
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Pre-sales commercial constraints — feeds the deterministic risk score below and gates
          project activation (Project DNA captured).
        </p>

        {riskScore && (
          <Tile style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span className="cds--type-heading-03">{riskScore.score}/100</span>
              <Tag type={RISK_BAND_TAG[riskScore.band]} size="sm">
                {RISK_BAND_LABEL[riskScore.band]}
              </Tag>
            </div>
            {riskScore.factors.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {riskScore.factors.map((f) => (
                  <li key={f.key} className="cds--type-body-01">
                    {f.label} (+{f.points})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No risk factors identified.
              </p>
            )}
          </Tile>
        )}

        <ProjectDnaForm projectId={project.id} values={dna} />
      </Column>
    </Grid>
  );
}
