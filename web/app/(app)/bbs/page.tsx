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
import { NewBbsScheduleForm } from "../../../components/aorms/NewBbsScheduleForm";

const STATUS_TAG: Record<string, "cool-gray" | "green"> = {
  DRAFT: "cool-gray",
  ISSUED: "green",
};

export default async function BbsPage() {
  const supabase = await createClient();

  const [{ data: schedules, error }, { data: projects }] = await Promise.all([
    supabase
      .from("bbs_schedules")
      .select("id, ref, title, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Bar Bending Schedules</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          IS 456 / IS 2502 cutting-length schedules — column, beam, slab and footing members.
        </p>

        <NewBbsScheduleForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load BBS schedules: {error.message}
          </p>
        ) : (
          <Table aria-label="BBS schedules" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(schedules ?? []).map((s) => {
                const project = Array.isArray(s.project_offices)
                  ? s.project_offices[0]
                  : (s.project_offices as { title: string } | null);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/bbs/${s.id}`}>{s.ref}</Link>
                    </TableCell>
                    <TableCell>{s.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[s.status] ?? "cool-gray"} size="sm">
                        {s.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(schedules ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No BBS schedules yet.
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
