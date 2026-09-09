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
import { AddPackageForm } from "../../../components/aorms/AddPackageForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

const STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "green" | "red"> = {
  DRAFT: "gray",
  TENDERING: "blue",
  AWARDED: "purple",
  IN_PROGRESS: "blue",
  COMPLETE: "green",
  CANCELLED: "red",
};

export default async function PmcPackagesPage() {
  const supabase = await createClient();

  const [{ data: packages, error }, { data: projects }] = await Promise.all([
    supabase
      .from("pmc_packages")
      .select("id, ref, title, trade, status, tender_close_date, contractors(name)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = packages ?? [];
  const tenderingCount = rows.filter((p) => p.status === "TENDERING").length;
  const awardedCount = rows.filter((p) => p.status === "AWARDED").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New work package" description="Start a new tendered work package.">
        <AddPackageForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Work Packages"
          description="Package-level tendering — a second sealed-bid system alongside the firm-issued Tenders module (Phase 9), ported as the distinct system it is today, not merged."
          actions={<ContextPanelTrigger size="sm">New package</ContextPanelTrigger>}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total packages" value={rows.length} />
          <KpiTile label="Tendering" value={tenderingCount} />
          <KpiTile label="Awarded" value={awardedCount} />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load packages: {error.message}
          </p>
        ) : (
          <Table aria-label="Work packages" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Trade</TableHeader>
                <TableHeader>Awarded to</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(packages ?? []).map((p) => {
                const contractor = Array.isArray(p.contractors) ? p.contractors[0] : (p.contractors as { name: string } | null);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/pmc-packages/${p.id}`}>{p.ref}</Link>
                    </TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{p.trade ?? "—"}</TableCell>
                    <TableCell>{contractor?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[p.status] ?? "gray"} size="sm">
                        {p.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(packages ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No packages yet.
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
