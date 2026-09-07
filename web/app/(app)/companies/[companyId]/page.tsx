import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Stack, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { InviteMemberForm } from "../../../../components/aorms/platform/InviteMemberForm";
import { MembershipRoleSelect } from "../../../../components/aorms/platform/MembershipRoleSelect";
import { LeaveCompanyButton } from "../../../../components/aorms/platform/LeaveCompanyButton";

type AccountEmbed = { id: string; full_name: string; public_id: string } | null;

/**
 * Company profile — reads via the platform's service-role client, scoped
 * by the current web/ user's own already-verified linked handle (same
 * justification as identity/page.tsx). OWNER-only invite/role-change/
 * remove controls only render for the caller's own ACTIVE OWNER
 * membership — the real gate is still the platform's RLS on the
 * underlying mutations, this is just what decides what to show.
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
    .select("id, name, public_id")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) notFound();

  const { data: memberships } = await platformService
    .from("memberships")
    .select("id, account_id, role, status, accounts(full_name, public_id)")
    .eq("company_id", companyId)
    .neq("status", "LEFT")
    .order("created_at", { ascending: true });

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
      <Column sm={4} md={8} lg={10}>
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
          <Tile style={{ marginTop: "1.5rem" }}>
            <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Add a member
            </h3>
            <InviteMemberForm companyId={company.id} />
          </Tile>
        )}
      </Column>
    </Grid>
  );
}
