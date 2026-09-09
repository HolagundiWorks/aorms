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
import { AddClientForm } from "../../../components/aorms/AddClientForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, kind, city, email, phone, disabled")
    .order("name");

  const rows = clients ?? [];
  const activeCount = rows.filter((c) => !c.disabled).length;
  const individualCount = rows.filter((c) => c.kind === "INDIVIDUAL").length;
  const cityCount = new Set(rows.map((c) => c.city).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New client" description="Add a client to AORMS.">
        <AddClientForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Clients"
              description="Client CRM — attach projects, invoices, and portal logins."
              actions={<ContextPanelTrigger size="sm">Create client</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total clients" value={rows.length} />
              <KpiTile label="Active" value={activeCount} />
              <KpiTile label="Individuals" value={individualCount} />
              <KpiTile label="Cities" value={cityCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load clients: {error.message}
              </p>
            ) : (
              <Table aria-label="Clients">
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>City</TableHeader>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Phone</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(clients ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.kind}</TableCell>
                      <TableCell>{c.city ?? "—"}</TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={c.disabled ? "gray" : "green"} size="sm">
                          {c.disabled ? "Disabled" : "Active"}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(clients ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No clients yet.
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
