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
    title: "Estimation & Tech",
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

export type SheetInfo = {
  sheet: string;
  section: string;
  page: string;
  /** Set for portal sheets: the portal's own name, used as the "office" in the floating footer instead of a firm name. */
  office?: string;
};

/**
 * The other surfaces share the sheet system (2026-10-01, "same UI/UX
 * everywhere"). Each portal is its own small drawing set: a two-letter code and
 * a flat, positional list — sheet `ID-01` is the Identity Portal's first page.
 * Hrefs match by longest prefix, so `/admin/accounts` is a SysDeX sheet and
 * `/portal/<project-id>` belongs to the Client Portal's Projects sheet.
 * The sign-in family is sheet `00` (Sign in) then `00.01`, `00.02`…
 */
export type PortalNav = { code: string; name: string; items: NavLeaf[] };

export const PORTALS: Record<string, PortalNav> = {
  identity: {
    code: "ID",
    name: "Identity Portal",
    items: [
      { href: "/identity", label: "Identity" },
      { href: "/licences", label: "Licences" },
      { href: "/studios", label: "Studios" },
      { href: "/support", label: "Support" },
    ],
  },
  connectdex: {
    code: "CX",
    name: "ConnectDeX Portal",
    items: [
      { href: "/connectdex", label: "My Company" },
      { href: "/materials", label: "Materials" },
      { href: "/connectdex-apply", label: "Apply" },
      { href: "/companies", label: "Companies" },
    ],
  },
  sysdex: {
    code: "SX",
    name: "SysDeX",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/accounts", label: "Users" },
      { href: "/admin/studios", label: "Studios" },
      { href: "/admin/companies", label: "Companies" },
      { href: "/admin/licences", label: "Licences" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/pricing", label: "Pricing" },
      { href: "/admin/connectdex", label: "ConnectDeX" },
      { href: "/admin/ai-connectors", label: "AI Connectors" },
      { href: "/admin/helpdesk", label: "HelpDeX" },
      { href: "/admin/logs", label: "Logs" },
    ],
  },
  client: { code: "CL", name: "Client Portal", items: [{ href: "/portal", label: "Projects" }] },
  contractor: { code: "CT", name: "Contractor Portal", items: [{ href: "/contractor-portal", label: "Tenders" }] },
  collab: { code: "CB", name: "Collaborator Portal", items: [{ href: "/collab-portal", label: "Projects" }] },
};

/** Sign-in family (platform login, signup, password flows, studio picker). Sheet "00", "00.01", … */
export const AUTH_NAV: NavLeaf[] = [
  { href: "/platform-login", label: "Sign in" },
  { href: "/platform-signup", label: "Create identity" },
  { href: "/platform-reset-password", label: "Set password" },
  { href: "/forgot-password", label: "Reset password" },
  { href: "/reset-password", label: "Set password" },
  { href: "/select-studio", label: "Choose studio" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Which sheet a URL belongs to (longest matching href wins), or null for non-nav routes. */
export function sheetFor(pathname: string): SheetInfo | null {
  let best: { info: SheetInfo; len: number } | null = null;
  const consider = (href: string, info: SheetInfo) => {
    if (isActive(pathname, href) && (!best || href.length > best.len)) best = { info, len: href.length };
  };
  NAV_TOP.forEach((t, i) => consider(t.href, { sheet: topSheet(i), section: i === 0 ? "Hub" : t.label, page: t.label }));
  NAV_GROUPS.forEach((g, gi) => g.items.forEach((it, ii) => consider(it.href, { sheet: itemSheet(gi, ii), section: g.title, page: it.label })));
  for (const portal of Object.values(PORTALS)) {
    portal.items.forEach((it, i) => consider(it.href, { sheet: `${portal.code}-${pad(i + 1)}`, section: portal.name, page: it.label, office: portal.name }));
  }
  AUTH_NAV.forEach((it, i) => consider(it.href, { sheet: i === 0 ? "00" : `00.${pad(i)}`, section: "Sign in", page: it.label, office: "AORMS" }));
  return best ? (best as { info: SheetInfo }).info : null;
}
