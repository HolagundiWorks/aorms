import { notFound } from "next/navigation";
import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { CpiEditor } from "../../../../../components/aorms/cpi/CpiEditor";
import type { CpiReportShape } from "../../../../../lib/cpi-sections";

export default async function ProjectCpiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

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

  // No row yet is normal — the questionnaire hasn't been started.
  const { data: cpi } = await supabase
    .from("cpi_responses")
    .select("sections, report, status")
    .eq("project_id", id)
    .maybeSingle();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1.5rem" }}>
          Client–Project Intelligence (CPI)
        </h1>

        <CpiEditor
          projectId={project.id}
          sections={(cpi?.sections as Record<string, Record<string, unknown>>) ?? {}}
          savedReport={(cpi?.report as CpiReportShape) ?? null}
          status={cpi?.status ?? "DRAFT"}
        />
      </Column>
    </Grid>
  );
}
