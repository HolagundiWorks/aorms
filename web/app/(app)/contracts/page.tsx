import { CheckmarkFilled, CurrencyRupee, DocumentSigned } from "@carbon/icons-react";
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
import { AddContractForm } from "../../../components/aorms/AddContractForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

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

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's "contracts:
// staff write" policy). Gates the "Add contract" trigger the same way
// Clients/Contractors/Projects already gate their own create triggers —
// found missing here by a 2026-09-21 sweep of every /app/(app)/*/page.tsx
// with an unguarded ContextPanelTrigger after the same class of bug was
// confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function ContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: contracts, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, ref, title, party, contract_type, value_paise, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = contracts ?? [];
  const activeCount = rows.filter((c) => c.status === "ACTIVE").length;
  const totalValuePaise = rows.reduce((sum, c) => sum + (c.value_paise ?? 0), 0);

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New contract" description="Add a contract or agreement record.">
          <AddContractForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Contracts"
              description="Contract / agreement register — clients, consultants, vendors."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add contract</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total contracts" value={rows.length} icon={DocumentSigned} />
              <KpiTile label="Active" value={activeCount} icon={CheckmarkFilled} />
              <KpiTile label="Total value" value={formatInr(totalValuePaise)} icon={CurrencyRupee} />
            </div>

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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
