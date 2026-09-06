import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function CollabPortalHomePage() {
  const supabase = await createClient();

  const { data: engagements, error } = await supabase
    .from("engagements")
    .select("id, scope, agreed_fee_paise, paid_paise, status, project_offices(id, ref, title, status)")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Your engagements</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Projects you're engaged on, agreed fee, and payments received.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load your engagements: {error.message}
          </p>
        ) : (
          <Table aria-label="Your engagements" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Scope</TableHeader>
                <TableHeader>Agreed fee</TableHeader>
                <TableHeader>Paid</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(engagements ?? []).map((e) => {
                const project = Array.isArray(e.project_offices)
                  ? e.project_offices[0]
                  : (e.project_offices as { id: string; ref: string; title: string } | null);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      {project ? <Link href={`/collab-portal/${project.id}`}>{project.title}</Link> : "—"}
                    </TableCell>
                    <TableCell>{e.scope ?? "—"}</TableCell>
                    <TableCell>{formatInr(e.agreed_fee_paise)}</TableCell>
                    <TableCell>{formatInr(e.paid_paise)}</TableCell>
                    <TableCell>
                      <Tag type="blue" size="sm">
                        {e.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(engagements ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No engagements yet.
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
