import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewConsultantForm } from "../../../components/aorms/NewConsultantForm";

/**
 * Consultants directory — the staff-facing side of migration 0021, which
 * only built the Collaborator Portal's read/submit side. `consultants` had
 * real RLS from day one but no UI at all, same gap `/contractors` had
 * before its own directory page existed.
 */
export default async function ConsultantsPage() {
  const supabase = await createClient();

  const { data: consultants, error } = await supabase
    .from("consultants")
    .select("id, name, discipline, firm, email, phone")
    .order("name");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Consultants</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Directory of external consultants the office sub-engages, by discipline. Portal logins
          for the Collaborator Portal aren&apos;t provisioned here yet — that&apos;s a Supabase
          Auth admin action, not built.
        </p>

        <NewConsultantForm />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load consultants: {error.message}
          </p>
        ) : (
          <Table aria-label="Consultants" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Discipline</TableHeader>
                <TableHeader>Firm</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Phone</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(consultants ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/consultants/${c.id}`}>{c.name}</Link>
                  </TableCell>
                  <TableCell>{c.discipline}</TableCell>
                  <TableCell>{c.firm ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(consultants ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No consultants yet.
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
