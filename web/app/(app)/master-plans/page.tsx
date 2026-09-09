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
import { AddMasterPlanForm } from "../../../components/aorms/AddMasterPlanForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function MasterPlansPage() {
  const supabase = await createClient();

  const { data: plans, error } = await supabase
    .from("master_plans")
    .select("id, name, category, file_name, version, notes, created_at")
    .order("created_at", { ascending: false });

  const rows = plans ?? [];
  const categoryCount = new Set(rows.map((p) => p.category).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add master plan" description="Register a master plan / zoning file.">
        <AddMasterPlanForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Master Plan Library"
              description="Firm-wide master plan and zoning file register."
              actions={<ContextPanelTrigger size="sm">Add master plan</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total plans" value={rows.length} />
              <KpiTile label="Categories" value={categoryCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load plans: {error.message}
              </p>
            ) : (
              <Table aria-label="Master plans" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>File</TableHeader>
                    <TableHeader>Version</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(plans ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Tag type="gray" size="sm">
                          {p.category}
                        </Tag>
                      </TableCell>
                      <TableCell>{p.file_name}</TableCell>
                      <TableCell>v{p.version}</TableCell>
                    </TableRow>
                  ))}
                  {(plans ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No master plans registered yet.
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
