import { notFound } from "next/navigation";
import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { updateAiRunApproval } from "../../../../lib/actions/ai";
import { AiRunApprovalActions } from "../../../../components/aorms/esti/AiRunApprovalActions";
import { PageHeader } from "../../../../components/aorms/PageHeader";

const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function AiRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: run, error }, { data: profile }] = await Promise.all([
    supabase
      .from("ai_runs")
      .select(
        "id, kind, provider, model, prompt_summary, sources, output_text, approval_state, issued_entity_type, issued_entity_id, used_external_api, token_estimate, created_at, project_offices(title), profiles(full_name)"
      )
      .eq("id", id)
      .maybeSingle(),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  if (error) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load run: {error.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!run) notFound();

  const project = Array.isArray(run.project_offices)
    ? run.project_offices[0]
    : (run.project_offices as { title: string } | null);
  const author = Array.isArray(run.profiles)
    ? run.profiles[0]
    : (run.profiles as { full_name: string | null } | null);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow={`${run.kind} · ${new Date(run.created_at).toLocaleString("en-IN")}`}
          title={`${run.provider} / ${run.model}`}
        />

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Tag
            type={
              run.approval_state === "APPROVED"
                ? "green"
                : run.approval_state === "REJECTED"
                  ? "red"
                  : "gray"
            }
          >
            {run.approval_state}
          </Tag>
          {run.used_external_api === "true" && <Tag type="purple">External API</Tag>}
          {run.issued_entity_type && (
            <Tag type="blue">
              Issued to {run.issued_entity_type} {run.issued_entity_id?.slice(0, 8)}
            </Tag>
          )}
        </div>

        {profile && WRITE_TIER_ROLES.has(profile.role) && (
          <div style={{ marginBottom: "1.5rem" }}>
            <AiRunApprovalActions actions={approvalActionsFor(run.approval_state, run.id)} />
          </div>
        )}

        <dl style={{ marginBottom: "1.5rem" }}>
          <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Project
          </dt>
          <dd className="cds--type-body-01" style={{ marginBottom: "0.75rem" }}>
            {project?.title ?? "—"}
          </dd>
          <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Requested by
          </dt>
          <dd className="cds--type-body-01" style={{ marginBottom: "0.75rem" }}>
            {author?.full_name ?? "—"}
          </dd>
          {run.token_estimate && (
            <>
              <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                Token estimate
              </dt>
              <dd className="cds--type-body-01" style={{ marginBottom: "0.75rem" }}>
                {run.token_estimate}
              </dd>
            </>
          )}
        </dl>

        {run.prompt_summary && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Prompt summary
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {run.prompt_summary}
            </p>
          </>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
          Output
        </h2>
        <p
          className="cds--type-body-01"
          style={{
            marginBottom: "1.5rem",
            whiteSpace: "pre-wrap",
            padding: "1rem",
            background: "var(--cds-layer-01)",
          }}
        >
          {run.output_text}
        </p>

        {Array.isArray(run.sources) && run.sources.length > 0 && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Sources
            </h2>
            <pre
              className="cds--type-code-01"
              style={{ padding: "1rem", background: "var(--cds-layer-01)", overflowX: "auto" }}
            >
              {JSON.stringify(run.sources, null, 2)}
            </pre>
          </>
        )}
      </Column>
    </Grid>
  );
}

/** Mirrors updateAiRunApproval()'s own APPROVAL_TRANSITIONS map — kept in
 * sync manually since a "use server" file can only export async functions,
 * not a plain object, for the client to import directly. */
function approvalActionsFor(state: string, runId: string) {
  const bind = (nextState: string) => updateAiRunApproval.bind(null, runId, nextState);
  switch (state) {
    case "DRAFT":
      return [
        { label: "Approve", kind: "primary" as const, action: bind("APPROVED") },
        { label: "Reject", kind: "danger--ghost" as const, action: bind("REJECTED") },
      ];
    case "APPROVED":
      return [
        { label: "Mark issued", kind: "primary" as const, action: bind("ISSUED") },
        { label: "Reject", kind: "danger--ghost" as const, action: bind("REJECTED") },
      ];
    case "REJECTED":
      return [{ label: "Reopen as draft", kind: "tertiary" as const, action: bind("DRAFT") }];
    default:
      return [];
  }
}
