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
import { NewContractForm } from "../../../components/aorms/NewContractForm";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ACTIVE: "green",
  COMPLETED: "blue",
  TERMINATED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ContractsPage() {
  const supabase = await createClient();

  const [{ data: contracts, error }, { data: projects }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, ref, title, party, contract_type, value_paise, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Contracts</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Contract / agreement register — clients, consultants, vendors.
        </p>

        <NewContractForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load contracts: {error.message}
          </p>
        ) : (
          <Table aria-label="Contracts" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Party</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Value</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(contracts ?? []).map((c) => {
                const project = Array.isArray(c.project_offices)
                  ? c.project_offices[0]
                  : (c.project_offices as { title: string } | null);
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.ref}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.party}</TableCell>
                    <TableCell>{c.contract_type}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{formatInr(c.value_paise)}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[c.status] ?? "gray"} size="sm">
                        {c.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(contracts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No contracts yet.
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
