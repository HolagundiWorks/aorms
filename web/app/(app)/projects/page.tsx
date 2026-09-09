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
import { AddProjectForm } from "../../../components/aorms/AddProjectForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

const STATUS_TAG: Record<string, "green" | "blue" | "gray" | "purple" | "teal"> = {
  ENQUIRY: "gray",
  PROPOSAL: "purple",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "teal",
  ARCHIVED: "gray",
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projects, error }, { data: clients }] = await Promise.all([
    supabase
      .from("project_offices")
      .select("id, ref, title, project_type, work_type, status, city, client_id, clients(name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  const rows = projects ?? [];
  const activeCount = rows.filter((p) => p.status === "ACTIVE").length;
  const enquiryCount = rows.filter((p) => p.status === "ENQUIRY").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="Create project" description="Start a new project office.">
        <AddProjectForm clients={clients ?? []} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Projects"
          description="Project offices — phases, tasks, and delivery live under each project."
          actions={<ContextPanelTrigger size="sm">Create project</ContextPanelTrigger>}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total projects" value={rows.length} />
          <KpiTile label="Active" value={activeCount} />
          <KpiTile label="Enquiry" value={enquiryCount} />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load projects: {error.message}
          </p>
        ) : (
          <Table aria-label="Projects">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Work type</TableHeader>
                <TableHeader>City</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(projects ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.ref}</TableCell>
                  <TableCell>
                    <Link href={`/projects/${p.id}`}>{p.title}</Link>
                  </TableCell>
                  <TableCell>
                    {(Array.isArray(p.clients) ? p.clients[0]?.name : (p.clients as { name: string } | null)?.name) ?? "—"}
                  </TableCell>
                  <TableCell>{p.project_type}</TableCell>
                  <TableCell>{p.work_type}</TableCell>
                  <TableCell>{p.city ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[p.status] ?? "gray"} size="sm">
                      {p.status ?? "—"}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
              {(projects ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No projects yet.
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
