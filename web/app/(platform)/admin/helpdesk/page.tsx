import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SupportTicketActionForm } from "../../../../components/aorms/platform/SupportTicketActionForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { Pager, pageRange, parsePage } from "../../../../components/aorms/platform/Pager";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

const STATUS_TAG: Record<string, "blue" | "teal" | "green" | "gray"> = {
  OPEN: "blue",
  IN_PROGRESS: "teal",
  RESOLVED: "green",
  CLOSED: "gray",
};

/**
 * HelpDeX — the AORMS Platform's support-ticket area, nested under SysDeX
 * (2026-09-10). Paged (50) and searchable server-side since 2026-10-06; filter by
 * Status to work the open queue.
 */
export default async function AdminHelpDeskPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = (sp.q ?? "").trim();
  const statusFilter = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(sp.status ?? "") ? (sp.status as string) : "";
  const [from, to] = pageRange(page);
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="HelpDeX" />;

  const platformService = createPlatformServiceRoleClient();
  // Server-side paging + search (2026-10-06, roadmap P1): newest first, 50 a page. Open work is surfaced
  // by the Status filter rather than by re-sorting a whole table in memory.
  let ticketQuery = platformService
    .from("support_tickets")
    .select("id, name, email, category, subject, message, status, admin_note, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (statusFilter) ticketQuery = ticketQuery.eq("status", statusFilter);
  // Escape LIKE wildcards; strip characters that would break PostgREST's or() syntax.
  const term = q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");
  if (term) ticketQuery = ticketQuery.or(`subject.ilike.%${term}%,name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data: tickets, count: ticketCount } = await ticketQuery;

  // Replies only for the tickets on this page.
  const ticketIds = (tickets ?? []).map((t) => t.id);
  const { data: replyRows } = ticketIds.length
    ? await platformService
        .from("support_ticket_replies")
        .select("ticket_id, message, emailed, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true })
    : { data: [] as { ticket_id: string; message: string; emailed: boolean; created_at: string }[] };
  const repliesByTicket = new Map<string, { message: string; emailed: boolean; created_at: string }[]>();
  for (const r of replyRows ?? []) repliesByTicket.set(r.ticket_id, [...(repliesByTicket.get(r.ticket_id) ?? []), r]);

  const sorted = tickets ?? [];

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="HelpDeX" result="Support requests answered and closed." description="Support tickets submitted via /support, platform-wide." />

          <form method="GET" action="/admin/helpdesk" role="search" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              name="q"
              defaultValue={q}
              aria-label="Search tickets by subject, name or email"
              placeholder="Search subject, name or email"
              style={{ flex: 1, minWidth: "14rem", minHeight: "2rem", padding: "0 0.75rem", border: "1px solid var(--aorms-rule)", background: "transparent", color: "inherit" }}
            />
            <select
              name="status"
              defaultValue={statusFilter}
              aria-label="Filter by status"
              style={{ minHeight: "2rem", padding: "0 0.5rem", border: "1px solid var(--aorms-rule)", background: "transparent", color: "inherit" }}
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button type="submit" className="cds--btn cds--btn--tertiary cds--btn--sm">
              Search
            </button>
          </form>

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
                  {(repliesByTicket.get(t.id) ?? []).map((r, i) => (
                    <p key={i} className="cds--type-body-01" style={{ borderInlineStart: "2px solid var(--aorms-ink)", paddingInlineStart: "0.75rem", whiteSpace: "pre-wrap" }}>
                      <strong>Reply</strong> <span className="cds--type-helper-text-01">({new Date(r.created_at).toLocaleString()}, {r.emailed ? "emailed" : "not emailed"})</span>
                      <br />
                      {r.message}
                    </p>
                  ))}
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
          <Pager basePath="/admin/helpdesk" page={page} total={ticketCount ?? 0} query={{ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}) }} />
        </Column>
      </Grid>
    </>
  );
}
