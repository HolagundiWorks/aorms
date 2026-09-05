import { notFound } from "next/navigation";
import { Column, Grid, Tile } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { AssessmentForm } from "../../../../../components/aorms/AssessmentForm";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: assessment }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("pre_project_assessments").select("*").eq("project_id", id).maybeSingle(),
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

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Pre-Project Assessment
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Deterministic build-feasibility maths. Every derived figure is recomputed server-side
          from these inputs on every save — gates project activation (Pre-project assessment
          recorded) and bounds Feasibility + Program below.
        </p>

        {assessment && (
          <Tile style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Site area</p>
                <p className="cds--type-heading-03">{assessment.site_area_sqm.toFixed(1)} sqm</p>
              </div>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Permissible FAR area</p>
                <p className="cds--type-heading-03">{assessment.permissible_far_area.toFixed(1)} sqm</p>
              </div>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Ground coverage</p>
                <p className="cds--type-heading-03">{assessment.actual_ground_coverage.toFixed(1)} sqm</p>
              </div>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Possible floors</p>
                <p className="cds--type-heading-03">{assessment.possible_floors.toFixed(1)}</p>
              </div>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Super-builtup area</p>
                <p className="cds--type-heading-03">{assessment.super_builtup_area.toFixed(1)} sqm</p>
              </div>
              <div>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>Estimated cost</p>
                <p className="cds--type-heading-03">{formatInr(assessment.estimated_project_cost_paise)}</p>
              </div>
            </div>
          </Tile>
        )}

        <AssessmentForm projectId={project.id} values={assessment} />
      </Column>
    </Grid>
  );
}
