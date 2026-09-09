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
import { AddContractorForm } from "../../../components/aorms/AddContractorForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { ProvisionPortalLoginForm } from "../../../components/aorms/ProvisionPortalLoginForm";
import { inviteContractorLogin } from "../../../lib/actions/portal-invites";

export default async function ContractorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: contractors, error }, { data: myProfile }, { data: withLogin }] = await Promise.all([
    supabase.from("contractors").select("id, name, category, company_name, contact_person, phone, city, active").order("name"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("contractor_id").not("contractor_id", "is", null),
  ]);
  const isOwner = myProfile?.role === "OWNER";
  const loginedIds = new Set((withLogin ?? []).map((p) => p.contractor_id));

  return (
    <ContextPanelLayout>
      <ContextPanel title="New contractor" description="Add an empanelled contractor to the directory.">
        <AddContractorForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Contractors"
              description={
                <>
                  Directory of empanelled contractors, by trade category.{" "}
                  {isOwner ? "Invite a contractor to a tender-bidding portal login below." : "Only the firm owner can provision portal logins."}
                </>
              }
              actions={<ContextPanelTrigger size="sm">Add contractor</ContextPanelTrigger>}
            />

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
                    <TableHeader>Portal login</TableHeader>
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
                      <TableCell>
                        {loginedIds.has(c.id) ? (
                          <Tag type="blue" size="sm">Provisioned</Tag>
                        ) : isOwner ? (
                          <ProvisionPortalLoginForm action={inviteContractorLogin.bind(null, c.id)} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(contractors ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
