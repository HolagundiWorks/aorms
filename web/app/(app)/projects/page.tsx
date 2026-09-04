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
import { NewProjectForm } from "../../../components/aorms/NewProjectForm";

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

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Projects</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Project offices — phases, tasks, and delivery live under each project.
        </p>

        <NewProjectForm clients={clients ?? []} />

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
  );
}
