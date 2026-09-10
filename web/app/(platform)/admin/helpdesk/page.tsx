import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SupportTicketActionForm } from "../../../../components/aorms/platform/SupportTicketActionForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

const STATUS_TAG: Record<string, "blue" | "teal" | "green" | "gray"> = {
  OPEN: "blue",
  IN_PROGRESS: "teal",
  RESOLVED: "green",
  CLOSED: "gray",
};

/**
 * HelpDeX — the AORMS Platform's support-ticket area, nested under SysDeX
 * (2026-09-10). Open/in-progress tickets first, then resolved/closed —
 * same "most-actionable-first" ordering as /admin/connectdex's pending
 * applications.
 */
export default async function AdminHelpDeskPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="HelpDeX" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: tickets } = await platformService
    .from("support_tickets")
    .select("id, name, email, category, subject, message, status, admin_note, created_at")
    .order("created_at", { ascending: false });

  const sorted = [...(tickets ?? [])].sort((a, b) => {
    const openFirst = (s: string) => (s === "OPEN" || s === "IN_PROGRESS" ? 0 : 1);
    return openFirst(a.status) - openFirst(b.status);
  });

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="HelpDeX" description="Support tickets submitted via /support, platform-wide." />

          <Stack gap={5}>
            {sorted.map((t) => (
              <Tile key={t.id}>
                <Stack gap={4}>
                  <Stack gap={2} orientation="horizontal" style={{ alignItems: "center" }}>
                    <h3 className="cds--type-productive-heading-03">{t.subject}</h3>
                    <Tag type="cool-gray" size="sm">
                      {t.category}
                    </Tag>
                    <Tag type={STATUS_TAG[t.status] ?? "gray"} size="sm">
                      {t.status}
                    </Tag>
                  </Stack>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {t.name} · {t.email} · {new Date(t.created_at).toLocaleString()}
                  </p>
                  <p className="cds--type-body-01">{t.message}</p>
                  <SupportTicketActionForm ticketId={t.id} currentStatus={t.status} currentNote={t.admin_note} />
                </Stack>
              </Tile>
            ))}
            {sorted.length === 0 && (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No support tickets yet.
              </p>
            )}
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
