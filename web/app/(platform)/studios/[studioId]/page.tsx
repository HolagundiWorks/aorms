import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, InlineNotification, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../../lib/supabase/server";
import { createClient as createPlatformClient } from "../../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { ConnectDriveButton } from "../../../../components/aorms/platform/ConnectDriveButton";
import { InviteMemberForm } from "../../../../components/aorms/platform/InviteMemberForm";
import { MembershipRoleSelect } from "../../../../components/aorms/platform/MembershipRoleSelect";
import { LeaveStudioButton } from "../../../../components/aorms/platform/LeaveStudioButton";
import { ProSeatToggle, ProSeatTag } from "../../../../components/aorms/platform/ProSeatToggle";
import { TransferOwnershipForm } from "../../../../components/aorms/platform/TransferOwnershipForm";
import { SetStudioSubdomainForm } from "../../../../components/aorms/platform/SetStudioSubdomainForm";
import { StudioProfileForm } from "../../../../components/aorms/platform/StudioProfileForm";
import { AddBoardMemberForm } from "../../../../components/aorms/platform/AddBoardMemberForm";
import { BoardMemberRow } from "../../../../components/aorms/platform/BoardMemberRow";
import { AddContactForm } from "../../../../components/aorms/platform/AddContactForm";
import { ContactRow } from "../../../../components/aorms/platform/ContactRow";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";
import { getFirmRoleForStudio } from "../../../../lib/platform/firm-studio";
import { ROLE_LABEL } from "../../../../lib/auth/rank";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Studio profile (an architecture firm — was called "Company" until the
 * 2026-09-07 rename freed that name for material-supplier businesses, see
 * the Studio/Company split + Material Catalogue plan) — reads via the
 * platform's service-role client. OWNER-only invite/role-change/remove
 * controls only render for the caller's own ACTIVE OWNER membership —
 * the real gate is still the platform's RLS on the underlying mutations,
 * this is just what decides what to show.
 *
 * Lives under the (platform) route group — see identity/page.tsx's header
 * comment. Carries the studio's regulatory/contact profile (COA/GST/tax/
 * address, board of directors, "who's who") — this is the data the Office
 * Hub's own Firm Settings page used to be the only place to edit; it's now
 * a read-only mirror pointing here.
 *
 * **2026-09-14 fix — same Office-Hub-link dead end already fixed on
 * identity/page.tsx and companies/[companyId]/page.tsx, found here too
 * (explicit report: "join firm, unjoin firms, admit people in firm in
 * identity portal not active").** This page's account resolution used
 * to be Office-Hub-only (`webSupabase` → `profiles.platform_public_id`
 * → `accounts`) — in production `/studios/[studioId]` is only ever
 * served on `identity.aorms.in` (proxy.ts's subdomain routing), and the
 * Office Hub's session cookie is host-scoped to plain `aorms.in`, so it
 * is never sent there. `currentAccountId` — and therefore `isOwner` —
 * was always false for every visitor, including the real owner, which
 * silently hid Add a member, role changes, remove-member, transfer
 * ownership, custom subdomain, and the editable studio profile form.
 * Resolved from the Platform's own session first instead (`accounts.id`
 * IS the platform auth uid directly, same as identity/page.tsx); the
 * Office-Hub-link path is kept as a fallback for local dev, where there
 * is no subdomain/cookie split at all.
 */
export default async function StudioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studioId: string }>;
  searchParams: Promise<{ drive_connected?: string; drive_error?: string }>;
}) {
  const { studioId } = await params;
  const sp = await searchParams;

  const platformSupabase = await createPlatformClient();
  const {
    data: { user: platformUser },
  } = await platformSupabase.auth.getUser();

  const platformService = createPlatformServiceRoleClient();

  let currentAccountId: string | null = platformUser?.id ?? null;
  if (!currentAccountId) {
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
    if (handle) {
      const { data: account } = await platformService.from("accounts").select("id").eq("public_id", handle).maybeSingle();
      currentAccountId = account?.id ?? null;
    }
  }

  const { data: studio, error: studioError } = await platformService
    .from("studios")
    .select(
      "id, name, public_id, subdomain_slug, coa_registration_no, gstin, pan, gst_type, tds_applicable_default, address_line1, address_line2, city, district, state, pincode, email, phone",
    )
    .eq("id", studioId)
    .maybeSingle();
  if (studioError) throw new Error(studioError.message);
  if (!studio) notFound();

  const { data: licence } = await platformService.from("licences").select("plan, seats, expires_at").eq("studio_id", studioId).maybeSingle();
  const seats = licence?.seats ?? 0;
  const enterpriseActive =
    licence?.plan === "ENTERPRISE" && (!licence.expires_at || new Date(licence.expires_at) > new Date());

  const [{ data: memberships }, { data: boardMembers }, { data: contacts }, { data: driveConnection }] = await Promise.all([
    platformService
      .from("studio_memberships")
      .select("id, account_id, role, status, pro_assigned_at, accounts(full_name, public_id)")
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
    platformService.from("drive_connections").select("google_account_email, status").eq("studio_id", studioId).maybeSingle(),
  ]);

  const proAssignedCount = (memberships ?? []).filter((m) => !!m.pro_assigned_at).length;

  // QA finding (2026-09-21) — this table's read-only Role tag (below) used
  // to show `m.role` straight off `studio_memberships` unconditionally:
  // the coarse Platform-side OWNER (studio creator, permanent)/MEMBER (no
  // promotion path) distinction — see getFirmRoleForStudio()'s own header
  // for why that's a genuinely different concept from a person's real
  // Office Hub firm role. identity/page.tsx's Studios list already
  // resolves and prefers the Office Hub firm role for exactly this kind
  // of read-only display (the B3 fix, 2026-09-20) — this page, a sibling
  // "same fact, different screen" display, was never updated to match,
  // so the same account/studio could show e.g. "OWNER" (Office Hub role,
  // via ROLE_LABEL "Administrator") on /identity and "MEMBER" (raw
  // Platform role) here. Resolved the same way, per row, and falls back
  // to the Platform role only when no Office Hub link resolves. Does NOT
  // touch the OWNER-only editable path (`MembershipRoleSelect` below) —
  // that dropdown mutates the real `studio_memberships.role` column
  // directly and must keep showing/editing that actual value, not a
  // different concept it can't write to.
  const firmRoleByMembershipId = new Map(
    await Promise.all(
      (memberships ?? []).map(async (m) => {
        const acc = (Array.isArray(m.accounts) ? m.accounts[0] : m.accounts) as AccountEmbed;
        if (!acc?.public_id) return [m.id, null] as const;
        const firmRole = await getFirmRoleForStudio(studio.public_id, acc.public_id);
        return [m.id, firmRole] as const;
      }),
    ),
  );

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
            <Stack gap={2} orientation="horizontal" style={{ alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="cds--type-heading-02" style={{ margin: 0 }}>
                Members
              </h2>
              {/* PRO is granted from this studio's own paid Pro/Enterprise
                  licence seats (2026-09-13) — no longer a free automatic
                  flip at 100 usage-hours. Seats come from /licences' own
                  Upgrade flow, already built — this is just the first
                  thing that count actually does; each plan now bakes in a
                  fixed allotment (20 for Pro, 9999 for Enterprise) rather
                  than a purchased quantity, see createLicenceOrder. */}
              <Tag type="cool-gray" size="sm">
                {proAssignedCount} of {seats} PRO seat{seats === 1 ? "" : "s"} used
              </Tag>
            </Stack>
            <Table aria-label="Studio members" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Member</TableHeader>
                  <TableHeader>Handle</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Level</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {isOwner && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(memberships ?? []).map((m) => {
                  const acc = (Array.isArray(m.accounts) ? m.accounts[0] : m.accounts) as AccountEmbed;
                  const isProAssigned = !!m.pro_assigned_at;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{acc?.full_name ?? "—"}</TableCell>
                      <TableCell>{acc?.public_id ?? "—"}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <MembershipRoleSelect membershipId={m.id} role={m.role} />
                        ) : (
                          (() => {
                            const displayRole = firmRoleByMembershipId.get(m.id) ?? m.role;
                            return (
                              <Tag type={displayRole === "OWNER" ? "purple" : "gray"} size="sm">
                                {ROLE_LABEL[displayRole] ?? displayRole}
                              </Tag>
                            );
                          })()
                        )}
                      </TableCell>
                      <TableCell>
                        {isOwner ? (
                          <ProSeatToggle
                            studioId={studio.id}
                            membershipId={m.id}
                            accountId={m.account_id}
                            isProAssigned={isProAssigned}
                            disableAssign={proAssignedCount >= seats}
                          />
                        ) : (
                          <ProSeatTag isProAssigned={isProAssigned} />
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

          {isOwner && (
            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Transfer ownership
              </h2>
              <Tile>
                <TransferOwnershipForm
                  studioId={studio.id}
                  otherActiveMembers={(memberships ?? [])
                    .filter((m) => m.account_id !== currentAccountId && m.status === "ACTIVE")
                    .map((m) => {
                      const acc = (Array.isArray(m.accounts) ? m.accounts[0] : m.accounts) as AccountEmbed;
                      return { accountId: m.account_id, label: `${acc?.full_name ?? "—"} (${acc?.public_id ?? "—"})` };
                    })}
                />
              </Tile>
            </div>
          )}

          {isOwner && enterpriseActive && (
            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Custom subdomain
              </h2>
              <Tile>
                <SetStudioSubdomainForm studioId={studio.id} currentSlug={studio.subdomain_slug} />
              </Tile>
            </div>
          )}

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
              Connections
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
              Third-party accounts linked to this Studio — connector credentials live here, on the identity
              platform, not on the Office Hub deployment itself.
            </p>
            <Tile>
              {sp.drive_connected === "true" && (
                <InlineNotification
                  kind="success"
                  title="Google Drive connected"
                  hideCloseButton
                  lowContrast
                  style={{ marginBottom: "1rem" }}
                />
              )}
              {sp.drive_error && (
                <InlineNotification
                  kind="error"
                  title="Couldn't connect Google Drive"
                  subtitle={sp.drive_error}
                  hideCloseButton
                  lowContrast
                  style={{ marginBottom: "1rem" }}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p className="cds--type-heading-compact-01">Google Drive</p>
                  <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
                    {driveConnection?.status === "CONNECTED"
                      ? `Connected${driveConnection.google_account_email ? ` as ${driveConnection.google_account_email}` : ""}.`
                      : "Documents stay in your own Drive — AORMS only stores the connection and each file's project/revision metadata."}
                  </p>
                </div>
                {driveConnection?.status !== "CONNECTED" &&
                  (isOwner ? (
                    <ConnectDriveButton studioId={studio.id} />
                  ) : (
                    <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                      Only the Studio owner can connect.
                    </p>
                  ))}
              </div>
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
