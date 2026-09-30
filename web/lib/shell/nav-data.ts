/**
 * Navigation index — the single source of truth for the office "drawing set"
 * (2026-09-30, HCWorks title-sheet direction). Pure data (no icons, no React)
 * so both the client AppShell and server-rendered page headers can use it.
 *
 * Every top-level entry and every group gets a two-digit SHEET number in the
 * order they appear in the side nav (Pulse is 00 — the hub); a page inside a
 * group is sheet `GG.NN` (group number . position), e.g. `04.03`. Adding or
 * reordering entries renumbers the set — numbers are positional, not stored.
 */
export type NavLeaf = { href: string; label: string };
export type NavGroupData = { title: string; items: NavLeaf[] };

export const NAV_TOP: NavLeaf[] = [
  { href: "/pulse", label: "Pulse" },
  { href: "/projects", label: "Projects" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
];

export const NAV_GROUPS: NavGroupData[] = [
  {
    title: "Site",
    items: [
      { href: "/snags", label: "Snags" },
      { href: "/site-instructions", label: "Site Instructions" },
      { href: "/progress-reports", label: "Progress Reports" },
      { href: "/bbs", label: "BBS" },
      { href: "/pmc-milestones", label: "Milestones" },
      { href: "/pmc-packages", label: "Work Packages" },
      { href: "/pmc-steel-certs", label: "Steel Certification" },
      { href: "/pmc-ra-bills", label: "RA Bills" },
      { href: "/approvals", label: "Approvals" },
    ],
  },
  {
    title: "Estimation & Technical",
    items: [
      { href: "/rate-books", label: "Rate Books" },
      { href: "/estimates", label: "Estimates" },
      { href: "/takeoff", label: "Take-off" },
      { href: "/spec-sheets", label: "Spec Sheets" },
      { href: "/drawings", label: "Drawings" },
      { href: "/moms", label: "Meeting Minutes" },
      { href: "/document-issues", label: "Document Issues" },
    ],
  },
  {
    title: "Third Parties",
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/contractors", label: "Contractors" },
      { href: "/consultants", label: "Consultants" },
    ],
  },
  {
    title: "Tender Management",
    items: [
      { href: "/tenders", label: "Tenders" },
    ],
  },
  {
    title: "Office",
    items: [
      { href: "/proposals", label: "Proposals" },
      { href: "/letters", label: "Letters" },
      { href: "/contracts", label: "Contracts" },
      { href: "/transmittals", label: "Transmittals" },
      { href: "/purchase-orders", label: "Purchase Orders" },
      { href: "/office-templates", label: "Office Templates" },
    ],
  },
  {
    title: "Accounts",
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/reports", label: "Financial Reports" },
      { href: "/accounts", label: "Office Expenses" },
      { href: "/reconcile", label: "Reconciliation" },
    ],
  },
  {
    title: "HR",
    items: [
      { href: "/team-members", label: "Team Members" },
      { href: "/teams", label: "Teams" },
      { href: "/payslips", label: "Payslips" },
      { href: "/job-applications", label: "Job Applications" },
    ],
  },
  {
    title: "Knowledge Bank",
    items: [
      { href: "/master-plans", label: "Master Plans" },
      { href: "/standards", label: "Standards" },
      { href: "/compliance", label: "Compliance" },
      { href: "/spec-catalog", label: "Spec Catalog" },
      { href: "/lessons", label: "Lessons Learned" },
      { href: "/knowledge-bank", label: "Knowledge Portal" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/workload", label: "Workload" },
      { href: "/audit-log", label: "Audit Log" },
      { href: "/users", label: "Users" },
      { href: "/firm-settings", label: "Firm Settings" },
      { href: "/ai-devices", label: "Esti Devices" },
    ],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Sheet number of a top-level entry (its index). */
export const topSheet = (index: number) => pad(index);
/** Sheet number of a group (continues after the top-level entries). */
export const groupSheet = (groupIndex: number) => pad(NAV_TOP.length + groupIndex);
/** Sheet number of a page inside a group, e.g. "04.03". */
export const itemSheet = (groupIndex: number, itemIndex: number) => `${groupSheet(groupIndex)}.${pad(itemIndex + 1)}`;

export type SheetInfo = { sheet: string; section: string; page: string };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Which sheet a URL belongs to (longest matching href wins), or null for non-nav routes. */
export function sheetFor(pathname: string): SheetInfo | null {
  let best: { info: SheetInfo; len: number } | null = null;
  NAV_TOP.forEach((t, i) => {
    if (isActive(pathname, t.href) && (!best || t.href.length > best.len)) {
      best = { info: { sheet: topSheet(i), section: i === 0 ? "Hub" : t.label, page: t.label }, len: t.href.length };
    }
  });
  NAV_GROUPS.forEach((g, gi) =>
    g.items.forEach((it, ii) => {
      if (isActive(pathname, it.href) && (!best || it.href.length > best.len)) {
        best = { info: { sheet: itemSheet(gi, ii), section: g.title, page: it.label }, len: it.href.length };
      }
    }),
  );
  return best ? (best as { info: SheetInfo }).info : null;
}
