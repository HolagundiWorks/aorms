import Link from "next/link";
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
import { createClient } from "../../../lib/supabase/server";
import { AddLeadForm } from "../../../components/aorms/AddLeadForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { LeadStatusSelect } from "../../../components/aorms/LeadStatusSelect";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, ref, client_name, lead_source, project_type, city, status, converted_project_id")
    .order("created_at", { ascending: false });

  const rows = leads ?? [];
  const qualifiedCount = rows.filter((l) => l.converted_project_id).length;
  const lostCount = rows.filter((l) => l.status === "DROPPED" || l.status === "LOST").length;
  const openCount = rows.length - qualifiedCount - lostCount;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New lead" description="Log an inbound enquiry.">
        <AddLeadForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Leads"
              description="Inbound enquiries, before a client or project exists — the start of the Project OS lead-to-activation pipeline."
              actions={<ContextPanelTrigger size="sm">Add lead</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total leads" value={rows.length} />
              <KpiTile label="Open" value={openCount} />
              <KpiTile label="Qualified" value={qualifiedCount} />
              <KpiTile label="Lost" value={lostCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load leads: {error.message}
              </p>
            ) : (
              <Table aria-label="Leads" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Client</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Project type</TableHeader>
                    <TableHeader>City</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(leads ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link href={`/leads/${l.id}`}>{l.ref}</Link>
                      </TableCell>
                      <TableCell>{l.client_name}</TableCell>
                      <TableCell>{l.lead_source}</TableCell>
                      <TableCell>{l.project_type ?? "—"}</TableCell>
                      <TableCell>{l.city ?? "—"}</TableCell>
                      <TableCell>
                        {l.converted_project_id ? (
                          <Tag type="green" size="sm">
                            QUALIFIED
                          </Tag>
                        ) : (
                          <LeadStatusSelect leadId={l.id} status={l.status} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(leads ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No leads yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
