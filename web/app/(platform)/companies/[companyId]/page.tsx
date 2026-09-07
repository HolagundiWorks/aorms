import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { InviteMemberForm } from "../../../../components/aorms/platform/InviteMemberForm";
import { MembershipRoleSelect } from "../../../../components/aorms/platform/MembershipRoleSelect";
import { LeaveCompanyButton } from "../../../../components/aorms/platform/LeaveCompanyButton";
import { CompanyProfileForm } from "../../../../components/aorms/platform/CompanyProfileForm";
import { AddBoardMemberForm } from "../../../../components/aorms/platform/AddBoardMemberForm";
import { RemoveBoardMemberButton } from "../../../../components/aorms/platform/RemoveBoardMemberButton";
import { AddContactForm } from "../../../../components/aorms/platform/AddContactForm";
import { RemoveContactButton } from "../../../../components/aorms/platform/RemoveContactButton";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Company profile — reads via the platform's service-role client, scoped
 * by the current web/ user's own already-verified linked handle (same
 * justification as identity/page.tsx). OWNER-only invite/role-change/
 * remove controls only render for the caller's own ACTIVE OWNER
 * membership — the real gate is still the platform's RLS on the
 * underlying mutations, this is just what decides what to show.
 *
 * Lives under the (platform) route group — see identity/page.tsx's header
 * comment (moved here from (app)/companies/[companyId]/ on explicit
 * request, per the AORMS Identity/Licence portal split plan). Now also
 * carries the company's regulatory/contact profile (COA/GST/tax/address,
 * board of directors, "who's who") — this is the data the Office Hub's
 * own Firm Settings page used to be the only place to edit; it's now a
 * read-only mirror pointing here.
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
      "id, name, public_id, coa_registration_no, gstin, pan, gst_type, tds_applicable_default, address_line1, address_line2, city, district, state, pincode, email, phone",
    )
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) notFound();

  const [{ data: memberships }, { data: boardMembers }, { data: contacts }] = await Promise.all([
    platformService
      .from("memberships")
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
        <Stack gap={2} orientation="horizontal">
          <h1 className="cds--type-heading-05">{company.name}</h1>
          <Tag type="cool-gray" size="md">
            {company.public_id}
          </Tag>
        </Stack>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          <NextLink href="/identity">← Back to My AORMS Identity</NextLink>
        </p>

        <Stack gap={6}>
          <div>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
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
                          <MembershipRoleSelect membershipId={m.id} role={m.role} />
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
                <InviteMemberForm companyId={company.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
              Company Profile
            </h2>
            <Tile>
              {isOwner ? (
                <CompanyProfileForm company={company} />
              ) : (
                <Stack gap={3}>
                  <p className="cds--type-body-01">COA reg. no.: {company.coa_registration_no ?? "—"}</p>
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
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
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
                  <TableRow key={b.id}>
                    <TableCell>{b.full_name}</TableCell>
                    <TableCell>{b.designation ?? "—"}</TableCell>
                    <TableCell>{b.din ?? "—"}</TableCell>
                    <TableCell>{b.appointed_at ?? "—"}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <RemoveBoardMemberButton boardMemberId={b.id} companyId={company.id} name={b.full_name} />
                      </TableCell>
                    )}
                  </TableRow>
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
                <AddBoardMemberForm companyId={company.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
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
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.full_name} {c.is_primary && <Tag type="green" size="sm">Primary</Tag>}
                    </TableCell>
                    <TableCell>{c.role_title ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <RemoveContactButton contactId={c.id} companyId={company.id} name={c.full_name} />
                      </TableCell>
                    )}
                  </TableRow>
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
                <AddContactForm companyId={company.id} />
              </Tile>
            )}
          </div>
        </Stack>
      </Column>
    </Grid>
  );
}
