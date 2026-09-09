import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { InviteCompanyMemberForm } from "../../../../components/aorms/platform/company/InviteCompanyMemberForm";
import { CompanyMembershipRoleSelect } from "../../../../components/aorms/platform/company/CompanyMembershipRoleSelect";
import { LeaveCompanyButton } from "../../../../components/aorms/platform/company/LeaveCompanyButton";
import { CompanyProfileForm } from "../../../../components/aorms/platform/company/CompanyProfileForm";
import { AddCompanyBoardMemberForm } from "../../../../components/aorms/platform/company/AddCompanyBoardMemberForm";
import { CompanyBoardMemberRow } from "../../../../components/aorms/platform/company/CompanyBoardMemberRow";
import { AddCompanyContactForm } from "../../../../components/aorms/platform/company/AddCompanyContactForm";
import { CompanyContactRow } from "../../../../components/aorms/platform/company/CompanyContactRow";
import { ProductCard, type Product } from "../../../../components/aorms/platform/company/ProductCard";
import { AddProductForm } from "../../../../components/aorms/platform/company/AddProductForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Company profile (a material-supplier business — building materials,
 * interior materials, finishes, other products — see the Studio/Company
 * split + Material Catalogue plan, 2026-09-07). Mirrors
 * studios/[studioId]/page.tsx exactly, minus the COA registration field
 * (Council of Architecture registration doesn't apply to a supplier) and
 * with a Products/Material Catalogue section to follow in Phase C. Reads
 * via the platform's service-role client, scoped by the current web/
 * user's own already-verified linked handle (same justification as
 * identity/page.tsx). OWNER-only invite/role-change/remove controls only
 * render for the caller's own ACTIVE OWNER membership — the real gate is
 * still the platform's RLS on the underlying mutations, this is just what
 * decides what to show.
 */
export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const handle = profile?.platform_public_id ?? null;

  const platformService = createPlatformServiceRoleClient();

  const { data: company, error: companyError } = await platformService
    .from("companies")
    .select(
      "id, name, public_id, gstin, pan, gst_type, tds_applicable_default, address_line1, address_line2, city, district, state, pincode, email, phone",
    )
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) notFound();

  const [{ data: memberships }, { data: boardMembers }, { data: contacts }, { data: products }] = await Promise.all([
    platformService
      .from("company_memberships")
      .select("id, account_id, role, status, accounts(full_name, public_id)")
      .eq("company_id", companyId)
      .neq("status", "LEFT")
      .order("created_at", { ascending: true }),
    platformService
      .from("company_board_members")
      .select("id, full_name, din, designation, appointed_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    platformService
      .from("company_contacts")
      .select("id, full_name, role_title, email, phone, is_primary")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    platformService
      .from("products")
      .select(
        "id, name, category, sku, mrp_paise, description, product_specifications(id, label, value), product_test_results(id, test_name, result, lab_name, tested_at)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
  ]);

  let currentAccountId: string | null = null;
  if (handle) {
    const { data: account } = await platformService
      .from("accounts")
      .select("id")
      .eq("public_id", handle)
      .maybeSingle();
    currentAccountId = account?.id ?? null;
  }

  const isOwner = (memberships ?? []).some(
    (m) => m.account_id === currentAccountId && m.role === "OWNER" && m.status === "ACTIVE",
  );

  return (
    <Grid>
      <Column sm={4} md={8} lg={12}>
        <PageHeader
          title={company.name}
          actions={
            <Tag type="cool-gray" size="md">
              {company.public_id}
            </Tag>
          }
        />
        <p
          className="cds--type-body-01"
          style={{ marginTop: "-1rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          <NextLink href="/identity">← Back to My AORMS Identity</NextLink>
        </p>

        <Stack gap={6}>
          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Members
            </h2>
            <Table aria-label="Company members" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Member</TableHeader>
                  <TableHeader>Handle</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {isOwner && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(memberships ?? []).map((m) => {
                  const acc = (Array.isArray(m.accounts) ? m.accounts[0] : m.accounts) as AccountEmbed;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{acc?.full_name ?? "—"}</TableCell>
                      <TableCell>{acc?.public_id ?? "—"}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <CompanyMembershipRoleSelect membershipId={m.id} role={m.role} />
                        ) : (
                          <Tag type={m.role === "OWNER" ? "purple" : "gray"} size="sm">
                            {m.role}
                          </Tag>
                        )}
                      </TableCell>
                      <TableCell>{m.status}</TableCell>
                      {isOwner && (
                        <TableCell>
                          <LeaveCompanyButton membershipId={m.id} companyName={company.name} />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {isOwner && (
              <Tile style={{ marginTop: "1rem" }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Add a member
                </h3>
                <InviteCompanyMemberForm companyId={company.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Company Profile
            </h2>
            <Tile>
              {isOwner ? (
                <CompanyProfileForm key={JSON.stringify(company)} company={company} />
              ) : (
                <Stack gap={3}>
                  <p className="cds--type-body-01">GSTIN: {company.gstin ?? "—"}</p>
                  <p className="cds--type-body-01">PAN: {company.pan ?? "—"}</p>
                  <p className="cds--type-body-01">
                    Address: {[company.address_line1, company.address_line2, company.city, company.state, company.pincode]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </Stack>
              )}
            </Tile>
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Board of Directors
            </h2>
            <Table aria-label="Board of directors" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Designation</TableHeader>
                  <TableHeader>DIN</TableHeader>
                  <TableHeader>Appointed</TableHeader>
                  {isOwner && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(boardMembers ?? []).map((b) => (
                  <CompanyBoardMemberRow key={b.id} member={b} companyId={company.id} isOwner={isOwner} />
                ))}
                {(boardMembers ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No board members recorded.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {isOwner && (
              <Tile style={{ marginTop: "1rem" }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Add a board member
                </h3>
                <AddCompanyBoardMemberForm companyId={company.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Who&apos;s Who
            </h2>
            <Table aria-label="Key contacts" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Phone</TableHeader>
                  {isOwner && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(contacts ?? []).map((c) => (
                  <CompanyContactRow key={c.id} contact={c} companyId={company.id} isOwner={isOwner} />
                ))}
                {(contacts ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No contacts recorded.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {isOwner && (
              <Tile style={{ marginTop: "1rem" }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Add a contact
                </h3>
                <AddCompanyContactForm companyId={company.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Material Catalogue
            </h2>
            <Stack gap={4}>
              {((products ?? []) as Product[]).map((product) => (
                <ProductCard key={product.id} product={product} companyId={company.id} isOwner={isOwner} />
              ))}
              {(products ?? []).length === 0 && (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  No products in the catalogue yet.
                </p>
              )}
            </Stack>
            {isOwner && (
              <Tile style={{ marginTop: "1rem" }}>
                <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Add a product
                </h3>
                <AddProductForm companyId={company.id} />
              </Tile>
            )}
          </div>
        </Stack>
      </Column>
    </Grid>
  );
}
