import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, InlineNotification, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createPlatformClient } from "../../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { InviteCompanyMemberForm } from "../../../../components/aorms/platform/company/InviteCompanyMemberForm";
import { CompanyMembershipRoleSelect } from "../../../../components/aorms/platform/company/CompanyMembershipRoleSelect";
import { LeaveCompanyButton } from "../../../../components/aorms/platform/company/LeaveCompanyButton";
import { CompanyProfileForm } from "../../../../components/aorms/platform/company/CompanyProfileForm";
import { ConnectDexOnboardingForm } from "../../../../components/aorms/platform/company/ConnectDexOnboardingForm";
import { PayConnectDexFeeButton } from "../../../../components/aorms/platform/company/PayConnectDexFeeButton";
import { AddCompanyBoardMemberForm } from "../../../../components/aorms/platform/company/AddCompanyBoardMemberForm";
import { CompanyBoardMemberRow } from "../../../../components/aorms/platform/company/CompanyBoardMemberRow";
import { AddCompanyContactForm } from "../../../../components/aorms/platform/company/AddCompanyContactForm";
import { CompanyContactRow } from "../../../../components/aorms/platform/company/CompanyContactRow";
import { ProductCard, type Product } from "../../../../components/aorms/platform/company/ProductCard";
import { AddProductForm } from "../../../../components/aorms/platform/company/AddProductForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { ConnectDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Company profile (a material-supplier business — building materials,
 * interior materials, finishes, other products — see the Studio/Company
 * split + Material Catalogue plan, 2026-09-07). Mirrors
 * studios/[studioId]/page.tsx exactly, minus the COA registration field
 * (Council of Architecture registration doesn't apply to a supplier) and
 * with a Products/Material Catalogue section to follow in Phase C.
 *
 * **2026-09-14 rewrite — Company/ConnectDeX identity split (platform
 * migration 0024):** the caller's own identity used to be resolved via the
 * Office Hub session → profiles.platform_public_id → `accounts` — that path
 * can no longer resolve a Company member at all (Company identities live
 * in their own `company_accounts` table now, unrelated to any Office Hub
 * link). Resolved directly from the AORMS Platform's own session instead
 * (same pattern as getCurrentPlatformSessionAccount(), just against
 * `company_accounts`). OWNER-only invite/role-change/remove controls only
 * render for the caller's own ACTIVE OWNER membership — the real gate is
 * still the platform's RLS on the underlying mutations, this is just what
 * decides what to show.
 */
export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const platformSupabase = await createPlatformClient();
  const {
    data: { user },
  } = await platformSupabase.auth.getUser();

  const platformService = createPlatformServiceRoleClient();
  const cx = platformService.schema("connectdex");

  const { data: company, error: companyError } = await cx
    .from("companies")
    .select(
      "id, name, public_id, status, gstin, pan, gst_type, tds_applicable_default, address_line1, address_line2, city, district, state, pincode, email, phone",
    )
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) notFound();

  // ConnectDeX Partners onboarding pipeline (2026-09-10) — a company
  // isn't ACTIVE until it's been onboarded, verified, and paid for. Each
  // pending status shows its own stage instead of the normal profile
  // view; only ACTIVE reaches the full page below. isOwner is checked
  // *here*, before this branch, not reused from the full-page section
  // further down — a non-owner shouldn't see the interactive onboarding
  // form or pay button at all, even though submitConnectDexOnboardingForm/
  // createConnectDexOnboardingOrder both already enforce ownership at the
  // action level regardless (this is UX polish on top of a real gate, not
  // the gate itself).
  if (company.status !== "ACTIVE") {
    let isPendingOwner = false;
    if (user) {
      const { data: membership } = await cx
        .from("company_memberships")
        .select("role, status")
        .eq("company_id", companyId)
        .eq("account_id", user.id)
        .maybeSingle();
      isPendingOwner = membership?.role === "OWNER" && membership?.status === "ACTIVE";
    }

    return (
      <>
        <ConnectDexPortalHeader />
        <Grid>
        <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
          <PageHeader
            title={company.name}
            actions={
              <Tag type="cool-gray" size="md">
                {company.public_id}
              </Tag>
            }
          />
          {!isPendingOwner && (
            <InlineNotification
              kind="info"
              title="Onboarding in progress"
              subtitle="This ConnectDeX Partners profile isn't active yet."
              lowContrast
              hideCloseButton
            />
          )}
          {isPendingOwner && company.status === "PENDING_ONBOARDING" && (
            <>
              <InlineNotification
                kind="info"
                title="Complete your onboarding"
                subtitle="A platform admin has invited you — fill in your business details to move to verification."
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1.5rem" }}
              />
              <ConnectDexOnboardingForm companyId={company.id} />
            </>
          )}
          {isPendingOwner && company.status === "PENDING_VERIFICATION" && (
            <InlineNotification
              kind="info"
              title="Under review"
              subtitle="Your onboarding details are being reviewed by an AORMS admin — you'll be able to pay the onboarding fee once verified."
              lowContrast
              hideCloseButton
            />
          )}
          {isPendingOwner && company.status === "PENDING_PAYMENT" && (
            <>
              <InlineNotification
                kind="success"
                title="Verified"
                subtitle="One step left — pay the flat onboarding fee to activate your ConnectDeX Partners profile."
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1.5rem" }}
              />
              <PayConnectDexFeeButton companyId={company.id} companyName={company.name} />
            </>
          )}
        </Column>
        </Grid>
      </>
    );
  }

  const [{ data: memberships }, { data: boardMembers }, { data: contacts }, { data: products }] = await Promise.all([
    cx
      .from("company_memberships")
      .select("id, account_id, role, status, company_accounts(full_name, public_id)")
      .eq("company_id", companyId)
      .neq("status", "LEFT")
      .order("created_at", { ascending: true }),
    cx
      .from("company_board_members")
      .select("id, full_name, din, designation, appointed_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    cx
      .from("company_contacts")
      .select("id, full_name, role_title, email, phone, is_primary")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    cx
      .from("products")
      .select(
        "id, name, category, sku, mrp_paise, description, product_specifications(id, label, value), product_test_results(id, test_name, result, lab_name, tested_at)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
  ]);

  const currentAccountId: string | null = user?.id ?? null;

  const isOwner = (memberships ?? []).some(
    (m) => m.account_id === currentAccountId && m.role === "OWNER" && m.status === "ACTIVE",
  );

  return (
    <>
      <ConnectDexPortalHeader />
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
                  const acc = (Array.isArray(m.company_accounts) ? m.company_accounts[0] : m.company_accounts) as AccountEmbed;
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
    </>
  );
}
