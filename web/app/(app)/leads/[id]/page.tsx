import { notFound } from "next/navigation";
import Link from "next/link";
import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { LeadStatusSelect } from "../../../../components/aorms/LeadStatusSelect";
import { ConvertLeadForm } from "../../../../components/aorms/ConvertLeadForm";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead, error: leadError }, { data: clients }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  if (leadError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load lead: {leadError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!lead) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {lead.ref} · {lead.lead_source}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <h1 className="cds--type-heading-05">{lead.client_name}</h1>
          {lead.converted_project_id ? (
            <Tag type="green" size="sm">
              QUALIFIED
            </Tag>
          ) : (
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
          )}
        </div>

        <dl style={{ marginBottom: "2rem" }}>
          <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Contact
          </dt>
          <dd className="cds--type-body-01" style={{ marginBottom: "0.75rem" }}>
            {lead.phone ?? "—"} · {lead.email ?? "—"}
          </dd>
          <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Project type / site
          </dt>
          <dd className="cds--type-body-01" style={{ marginBottom: "0.75rem" }}>
            {lead.project_type ?? "—"} · {lead.site_location ?? "—"} {lead.city ? `(${lead.city})` : ""}
          </dd>
          {lead.notes && (
            <>
              <dt className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                Notes
              </dt>
              <dd className="cds--type-body-01">{lead.notes}</dd>
            </>
          )}
        </dl>

        {lead.converted_project_id ? (
          <p className="cds--type-body-01">
            Converted to project{" "}
            <Link href={`/projects/${lead.converted_project_id}`}>this project</Link>.
          </p>
        ) : (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
              Convert to project
            </h2>
            <ConvertLeadForm leadId={lead.id} clients={clients ?? []} />
          </>
        )}
      </Column>
    </Grid>
  );
}
