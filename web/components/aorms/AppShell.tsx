"use client";

import type { ComponentType } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  Content,
} from "@carbon/react";
import {
  Logout,
  Dashboard,
  UserFollow,
  Building,
  FolderDetails,
  Task,
  Document,
  Currency,
  Ruler,
  Delivery as DeliveryIcon,
  Book,
  Group,
  Settings,
  MachineLearning,
} from "@carbon/icons-react";
import { signOut } from "../../lib/actions/auth";

type NavLeaf = { href: string; label: string };
type NavGroup = { title: string; icon: ComponentType; items: NavLeaf[] };

/**
 * Top-level items (always visible, no group) — the pillars a user reaches
 * for constantly: the office-wide feed, the sales pipeline, the client
 * register, the project list, and the personal work queue. Everything else
 * is a supporting register, grouped below by who reaches for it and how
 * often, not by which Supabase table it happens to read.
 */
const TOP_LEVEL: (NavLeaf & { icon: ComponentType })[] = [
  { href: "/dashboard", label: "Dashboard", icon: Dashboard },
  { href: "/leads", label: "Leads", icon: UserFollow },
  { href: "/clients", label: "Clients", icon: Building },
  { href: "/projects", label: "Projects", icon: FolderDetails },
  { href: "/tasks", label: "Tasks", icon: Task },
];

/**
 * Grouped by domain, matching this codebase's own module map (CLAUDE.md) —
 * Office (capture + papers), Finance, Estimation/Technical, Delivery
 * (site supervision + AProc), Library, People (HR), and Admin/Ops — rather
 * than NAVIGATION.md's old-frontend IA verbatim, since web/'s actual routes
 * (this rebuild's own page-per-phase naming) don't map 1:1 onto that
 * document's tab/facet structure. See docs/esti/NAVIGATION.md's own header:
 * it documents `frontend/src/App.tsx`'s nav, not this app's.
 */
const GROUPS: NavGroup[] = [
  {
    title: "Office",
    icon: Document,
    items: [
      { href: "/proposals", label: "Proposals" },
      { href: "/letters", label: "Letters" },
      { href: "/contracts", label: "Contracts" },
      { href: "/transmittals", label: "Transmittals" },
      { href: "/tenders", label: "Tenders" },
      { href: "/purchase-orders", label: "Purchase Orders" },
    ],
  },
  {
    title: "Finance",
    icon: Currency,
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/reports", label: "Financial Reports" },
    ],
  },
  {
    title: "Estimation & Technical",
    icon: Ruler,
    items: [
      { href: "/rate-books", label: "Rate Books" },
      { href: "/estimates", label: "Estimates" },
      { href: "/spec-sheets", label: "Spec Sheets" },
      { href: "/drawings", label: "Drawings" },
      { href: "/moms", label: "Meeting Minutes" },
      { href: "/document-issues", label: "Document Issues" },
    ],
  },
  {
    title: "Delivery",
    icon: DeliveryIcon,
    items: [
      { href: "/snags", label: "Snags" },
      { href: "/site-instructions", label: "Site Instructions" },
      { href: "/progress-reports", label: "Progress Reports" },
      { href: "/bbs", label: "BBS" },
      { href: "/pmc-milestones", label: "Milestones" },
      { href: "/pmc-packages", label: "Work Packages" },
      { href: "/pmc-steel-certs", label: "Steel Certification" },
      { href: "/pmc-ra-bills", label: "RA Bills" },
      { href: "/contractors", label: "Contractors" },
      { href: "/consultants", label: "Consultants" },
      { href: "/approvals", label: "Approvals" },
    ],
  },
  {
    title: "Library",
    icon: Book,
    items: [
      { href: "/master-plans", label: "Master Plans" },
      { href: "/standards", label: "Standards" },
      { href: "/compliance", label: "Compliance" },
      { href: "/lessons", label: "Lessons Learned" },
      { href: "/knowledge-bank", label: "Knowledge Bank" },
    ],
  },
  {
    title: "People",
    icon: Group,
    items: [
      { href: "/team-members", label: "Team Members" },
      { href: "/teams", label: "Teams" },
      { href: "/payslips", label: "Payslips" },
      { href: "/job-applications", label: "Job Applications" },
    ],
  },
  {
    title: "Admin",
    icon: Settings,
    items: [
      { href: "/workload", label: "Workload" },
      { href: "/audit-log", label: "Audit Log" },
      { href: "/firm-settings", label: "Firm Settings" },
    ],
  },
];

/** A route is "active" for a link at exactly itself, and for a group's
 * expand/highlight state at itself or any of its own sub-pages (so /projects/[id]
 * still highlights the Projects link, matching the old frontend's isActive
 * convention) — never by bare prefix, which would e.g. wrongly light up
 * /invoices for a route like /invoices-archive if one ever existed. */
function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <Header aria-label="AORMS">
        <HeaderName href="/dashboard" prefix="">
          <span style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* Plain <img>, not next/image: a fixed 14KB brand asset that
                never changes doesn't need the Image optimizer. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "16px", width: "auto" }} />
            <span>Office Hub</span>
          </span>
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="AI Runs"
            isActive={isActiveHref(pathname, "/ai-runs")}
            onClick={() => router.push("/ai-runs")}
          >
            <MachineLearning size={20} />
          </HeaderGlobalAction>
          <form action={signOut}>
            {/* Carbon doesn't forward a `type` prop, but a <button> defaults to
                type="submit" inside a <form> — this still triggers signOut. */}
            <HeaderGlobalAction aria-label="Sign out">
              <Logout size={20} />
            </HeaderGlobalAction>
          </form>
        </HeaderGlobalBar>
      </Header>
      <SideNav aria-label="Side navigation" isFixedNav expanded isChildOfHeader={false}>
        <SideNavItems>
          {TOP_LEVEL.map((item) => (
            <SideNavLink
              key={item.href}
              as={NextLink}
              href={item.href}
              renderIcon={item.icon}
              isActive={isActiveHref(pathname, item.href)}
            >
              {item.label}
            </SideNavLink>
          ))}
          {GROUPS.map((group) => {
            const groupIsActive = group.items.some((item) => isActiveHref(pathname, item.href));
            return (
              <SideNavMenu key={group.title} title={group.title} renderIcon={group.icon} defaultExpanded={groupIsActive}>
                {group.items.map((item) => (
                  <SideNavMenuItem key={item.href} as={NextLink} href={item.href} isActive={isActiveHref(pathname, item.href)}>
                    {item.label}
                  </SideNavMenuItem>
                ))}
              </SideNavMenu>
            );
          })}
        </SideNavItems>
      </SideNav>
      <Content>{children}</Content>
    </>
  );
}
