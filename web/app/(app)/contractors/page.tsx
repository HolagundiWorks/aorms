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
import { NewContractorForm } from "../../../components/aorms/NewContractorForm";

export default async function ContractorsPage() {
  const supabase = await createClient();

  const { data: contractors, error } = await supabase
    .from("contractors")
    .select("id, name, category, company_name, contact_person, phone, city, active")
    .order("name");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Contractors</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Directory of empanelled contractors, by trade category. Portal logins for tender
          bidding aren&apos;t provisioned here yet — that&apos;s a Supabase Auth admin action,
          not built.
        </p>

        <NewContractorForm />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load contractors: {error.message}
          </p>
        ) : (
          <Table aria-label="Contractors" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Company</TableHeader>
                <TableHeader>Contact</TableHeader>
                <TableHeader>Phone</TableHeader>
                <TableHeader>City</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(contractors ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>{c.company_name ?? "—"}</TableCell>
                  <TableCell>{c.contact_person ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={c.active ? "green" : "gray"} size="sm">
                      {c.active ? "Active" : "Inactive"}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
              {(contractors ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No contractors yet.
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
