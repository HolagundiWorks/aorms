import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewConsultantForm } from "../../../components/aorms/NewConsultantForm";
import { ProvisionPortalLoginForm } from "../../../components/aorms/ProvisionPortalLoginForm";
import { inviteConsultantLogin } from "../../../lib/actions/portal-invites";

/**
 * Consultants directory — the staff-facing side of migration 0021, which
 * only built the Collaborator Portal's read/submit side. `consultants` had
 * real RLS from day one but no UI at all, same gap `/contractors` had
 * before its own directory page existed. Portal login provisioning
 * (2026-09-08) mirrors /contractors' own — see portal-invites.ts.
 */
export default async function ConsultantsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: consultants, error }, { data: myProfile }, { data: withLogin }] = await Promise.all([
    supabase.from("consultants").select("id, name, discipline, firm, email, phone").order("name"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("consultant_id").not("consultant_id", "is", null),
  ]);
  const isOwner = myProfile?.role === "OWNER";
  const loginedIds = new Set((withLogin ?? []).map((p) => p.consultant_id));

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Consultants</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Directory of external consultants the office sub-engages, by discipline. {isOwner ? "Invite a consultant to the Collaborator Portal below." : "Only the firm owner can provision portal logins."}
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
                <TableHeader>Portal login</TableHeader>
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
                  <TableCell>
                    {loginedIds.has(c.id) ? (
                      <Tag type="blue" size="sm">Provisioned</Tag>
                    ) : isOwner ? (
                      <ProvisionPortalLoginForm action={inviteConsultantLogin.bind(null, c.id)} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(consultants ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
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
