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
import { ToolKit, CheckmarkFilled, Login } from "@carbon/icons-react";
import { createClient } from "../../../lib/supabase/server";
import { AddContractorForm } from "../../../components/aorms/AddContractorForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { ImportExportBar } from "../../../components/aorms/ImportExportBar";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { ProvisionPortalLoginForm } from "../../../components/aorms/ProvisionPortalLoginForm";
import { inviteContractorLogin } from "../../../lib/actions/portal-invites";
import { importContractorsCsv } from "../../../lib/actions/contractors";

// Same set as app/(app)/clients/page.tsx's own WRITE_TIER_ROLES (mirrored
// from lib/actions/clients.ts) — gates the "Add contractor" trigger and
// CSV import bar for VIEWER the same way Clients now does (found by the
// same 2026-09-20 QA pass: this page never gated its write UI at all).
// Note: unlike `clients`, `contractors`' own RLS write policy ("contractors:
// staff write", migration 0012, altered by 0059) still gates on
// `is_office_staff()` rather than `has_capability('write')` — that
// migration's own header comment says this was "confirmed from the
// routers directly" against the old backend's actual behavior, not an
// oversight, so it's left untouched here rather than silently changed
// alongside an unrelated UI fix; flagged separately for a security review
// rather than half-fixed. This UI gate is a defense-in-depth/consistency
// fix on top, not a claim that VIEWER is blocked server-side too.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

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
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);
  const loginedIds = new Set((withLogin ?? []).map((p) => p.contractor_id));

  const rows = contractors ?? [];
  const activeCount = rows.filter((c) => c.active).length;
  const provisionedCount = rows.filter((c) => loginedIds.has(c.id)).length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New contractor" description="Add an empanelled contractor to the directory.">
          <AddContractorForm />
        </ContextPanel>
      )}
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
              actions={canWrite ? <ContextPanelTrigger size="sm">Add contractor</ContextPanelTrigger> : undefined}
            />

            {canWrite && (
              <ImportExportBar
                title="Contractors"
                exportHref="/api/contractors/export"
                templateHref="/api/contractors/import-template"
                importAction={importContractorsCsv}
                notes="Category must be one of: Civil, Structural steel, MEP, Electrical, Plumbing, HVAC, Interior, Facade, Waterproofing, Flooring, Painting, Landscape, General, Other (blank defaults to General)."
              />
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total contractors" value={rows.length} icon={ToolKit} />
              <KpiTile label="Active" value={activeCount} icon={CheckmarkFilled} />
              <KpiTile label="Portal logins" value={provisionedCount} icon={Login} />
            </div>

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
