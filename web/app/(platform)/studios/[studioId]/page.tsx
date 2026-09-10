import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { InviteMemberForm } from "../../../../components/aorms/platform/InviteMemberForm";
import { MembershipRoleSelect } from "../../../../components/aorms/platform/MembershipRoleSelect";
import { LeaveStudioButton } from "../../../../components/aorms/platform/LeaveStudioButton";
import { StudioProfileForm } from "../../../../components/aorms/platform/StudioProfileForm";
import { AddBoardMemberForm } from "../../../../components/aorms/platform/AddBoardMemberForm";
import { BoardMemberRow } from "../../../../components/aorms/platform/BoardMemberRow";
import { AddContactForm } from "../../../../components/aorms/platform/AddContactForm";
import { ContactRow } from "../../../../components/aorms/platform/ContactRow";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Studio profile (an architecture firm — was called "Company" until the
 * 2026-09-07 rename freed that name for material-supplier businesses, see
 * the Studio/Company split + Material Catalogue plan) — reads via the
 * platform's service-role client, scoped by the current web/ user's own
 * already-verified linked handle (same justification as identity/page.tsx).
 * OWNER-only invite/role-change/remove controls only render for the
 * caller's own ACTIVE OWNER membership — the real gate is still the
 * platform's RLS on the underlying mutations, this is just what decides
 * what to show.
 *
 * Lives under the (platform) route group — see identity/page.tsx's header
 * comment. Carries the studio's regulatory/contact profile (COA/GST/tax/
 * address, board of directors, "who's who") — this is the data the Office
 * Hub's own Firm Settings page used to be the only place to edit; it's now
 * a read-only mirror pointing here.
 */
export default async function StudioDetailPage({ params }: { params: Promise<{ studioId: string }> }) {
  const { studioId } = await params;

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

  const { data: studio, error: studioError } = await platformService
    .from("studios")
    .select(
      "id, name, public_id, coa_registration_no, gstin, pan, gst_type, tds_applicable_default, address_line1, address_line2, city, district, state, pincode, email, phone",
    )
    .eq("id", studioId)
    .maybeSingle();
  if (studioError) throw new Error(studioError.message);
  if (!studio) notFound();

  const [{ data: memberships }, { data: boardMembers }, { data: contacts }] = await Promise.all([
    platformService
      .from("studio_memberships")
      .select("id, account_id, role, status, accounts(full_name, public_id)")
      .eq("studio_id", studioId)
      .neq("status", "LEFT")
      .order("created_at", { ascending: true }),
    platformService
      .from("studio_board_members")
      .select("id, full_name, din, designation, appointed_at")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: true }),
    platformService
      .from("studio_contacts")
      .select("id, full_name, role_title, email, phone, is_primary")
      .eq("studio_id", studioId)
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
    <>
      <IdentityPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={12}>
        <PageHeader
          title={studio.name}
          actions={
            <Tag type="cool-gray" size="md">
              {studio.public_id}
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
            <Table aria-label="Studio members" className="aorms-table-spaced">
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
                          <LeaveStudioButton membershipId={m.id} studioName={studio.name} />
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
                <InviteMemberForm studioId={studio.id} />
              </Tile>
            )}
          </div>

          <div>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Studio Profile
            </h2>
            <Tile>
              {isOwner ? (
                <StudioProfileForm key={JSON.stringify(studio)} studio={studio} />
              ) : (
                <Stack gap={3}>
                  <p className="cds--type-body-01">COA reg. no.: {studio.coa_registration_no ?? "—"}</p>
                  <p className="cds--type-body-01">GSTIN: {studio.gstin ?? "—"}</p>
                  <p className="cds--type-body-01">PAN: {studio.pan ?? "—"}</p>
                  <p className="cds--type-body-01">
                    Address: {[studio.address_line1, studio.address_line2, studio.city, studio.state, studio.pincode]
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
                  <BoardMemberRow key={b.id} member={b} studioId={studio.id} isOwner={isOwner} />
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
                <AddBoardMemberForm studioId={studio.id} />
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
                  <ContactRow key={c.id} contact={c} studioId={studio.id} isOwner={isOwner} />
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
                <AddContactForm studioId={studio.id} />
              </Tile>
            )}
          </div>
        </Stack>
      </Column>
      </Grid>
    </>
  );
}
