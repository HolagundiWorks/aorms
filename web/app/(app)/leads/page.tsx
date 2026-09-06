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
import { NewLeadForm } from "../../../components/aorms/NewLeadForm";
import { LeadStatusSelect } from "../../../components/aorms/LeadStatusSelect";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, ref, client_name, lead_source, project_type, city, status, converted_project_id")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Leads</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Inbound enquiries, before a client or project exists — the start of the Project OS
          lead-to-activation pipeline.
        </p>

        <NewLeadForm />

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
  );
}
