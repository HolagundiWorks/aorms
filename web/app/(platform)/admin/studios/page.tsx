import NextLink from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * SysDeX — Studios, SUPER_ADMIN only (2026-09-14, portal-completion audit
 * finding: there was no platform-wide, browsable Studio directory anywhere
 * in SysDeX — only a bare count on the dashboard and the per-studio detail
 * page (`/studios/[studioId]`), reachable only by a member or by an admin
 * who already happens to know the studio's id. `/admin/licences` came
 * close (it lists every studio, one per licence row) but is licence-
 * framed, not a general directory — no city/state, no member count, no
 * link into the studio's own detail page. This page is the missing
 * "browse every Studio" list, distinct from that licence-management view.
 *
 * Member counts are computed client-side from `studio_memberships`
 * (ACTIVE only) rather than a SQL `count(*) group by studio_id` — same
 * pattern already used by `/admin/ai-connectors` for its grant rows;
 * fine at this scale, revisit with a real aggregate query if the studio
 * count ever grows large enough for it to matter.
 */
export default async function AdminStudiosPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Studios" />;

  const platformService = createPlatformServiceRoleClient();
  const [{ data: studios }, { data: memberships }, { data: licences }] = await Promise.all([
    platformService
      .from("studios")
      .select("id, name, public_id, city, state, created_at")
      .order("created_at", { ascending: false }),
    platformService.from("studio_memberships").select("studio_id").eq("status", "ACTIVE"),
    platformService.from("licences").select("studio_id, plan"),
  ]);

  const memberCountByStudio = new Map<string, number>();
  for (const m of memberships ?? []) {
    memberCountByStudio.set(m.studio_id, (memberCountByStudio.get(m.studio_id) ?? 0) + 1);
  }
  const planByStudio = new Map((licences ?? []).map((l) => [l.studio_id, l.plan as string]));

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Studios" description="Every architecture-firm Studio on the AORMS Platform." />

          <Table aria-label="Studios" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Handle</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Members</TableHeader>
                <TableHeader>Plan</TableHeader>
                <TableHeader>Created</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(studios ?? []).map((s) => {
                const plan = planByStudio.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <NextLink href={`/studios/${s.id}`}>{s.name}</NextLink>
                    </TableCell>
                    <TableCell>{s.public_id}</TableCell>
                    <TableCell>{[s.city, s.state].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>{memberCountByStudio.get(s.id) ?? 0}</TableCell>
                    <TableCell>
                      {plan ? (
                        <Tag
                          type={plan === "ENTERPRISE" ? "magenta" : plan === "PROFESSIONAL" ? "purple" : plan === "STUDIO" ? "blue" : "gray"}
                          size="sm"
                        >
                          {plan === "STUDIO" ? "Studio" : plan === "PROFESSIONAL" ? "Professional" : plan === "ENTERPRISE" ? "Enterprise" : "Free"}
                        </Tag>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
              {(studios ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No studios yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
