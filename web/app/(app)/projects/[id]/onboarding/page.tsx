import { notFound } from "next/navigation";
import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { OnboardingForm } from "../../../../../components/aorms/OnboardingForm";
import { OnboardingStatusActions } from "../../../../../components/aorms/OnboardingStatusActions";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: onboarding }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("client_onboardings").select("*").eq("project_id", id).maybeSingle(),
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

  const status = onboarding?.status ?? "PENDING";
  const authorizedReps = Array.isArray(onboarding?.authorized_reps) ? onboarding.authorized_reps : [];

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <h1 className="cds--type-heading-05">Client Onboarding</h1>
          <Tag type={status === "COMPLETE" ? "green" : "blue"} size="sm">
            {status}
          </Tag>
        </div>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Formal onboarding — gates project activation (Client onboarding complete). Document
          upload isn&apos;t wired up yet (register-only pattern, no upload Route Handler).
        </p>

        <OnboardingStatusActions projectId={project.id} status={status} />

        {authorizedReps.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
              Authorized representatives
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {authorizedReps.map((r: { name: string; designation?: string; phone?: string }, i: number) => (
                <li key={i} className="cds--type-body-01">
                  {r.name}
                  {r.designation ? ` — ${r.designation}` : ""}
                  {r.phone ? ` (${r.phone})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <OnboardingForm projectId={project.id} values={onboarding} />
      </Column>
    </Grid>
  );
}
