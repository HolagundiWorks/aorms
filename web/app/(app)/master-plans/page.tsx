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
import { NewMasterPlanForm } from "../../../components/aorms/NewMasterPlanForm";

export default async function MasterPlansPage() {
  const supabase = await createClient();

  const { data: plans, error } = await supabase
    .from("master_plans")
    .select("id, name, category, file_name, version, notes, created_at")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Master Plan Library</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Firm-wide master plan and zoning file register.
        </p>

        <NewMasterPlanForm />

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
  );
}
