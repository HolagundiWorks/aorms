"use client";

import { useState, type ComponentType } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
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
  Activity,
} from "@carbon/icons-react";
import { signOut } from "../../lib/actions/auth";
import { PomodoroProvider } from "./pomodoro/PomodoroContext";
import { HeaderPomodoro } from "./pomodoro/HeaderPomodoro";
import { HeaderCalculator } from "./calculator/HeaderCalculator";
import { HeaderWellness } from "./wellness/HeaderWellness";
import { HeaderEsti } from "./esti/HeaderEsti";

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
  { href: "/pulse", label: "Pulse", icon: Activity },
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
      { href: "/office-templates", label: "Office Templates" },
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
      { href: "/takeoff", label: "Take-off" },
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
      { href: "/spec-catalog", label: "Spec Catalog" },
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
      { href: "/users", label: "Users" },
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
  // isPersistent (Carbon's default, left un-set here) means Carbon's own
  // ui-shell CSS ignores this state above its ~66rem breakpoint — nav stays
  // fixed-open on desktop exactly as before — and respects it below that
  // breakpoint, where the SideNav becomes a dismissible overlay. Previously
  // hardcoded isFixedNav + expanded (no state, no toggle at all) forced the
  // nav permanently open even on a phone-width viewport, squeezing all page
  // content into a sliver — found during a UI audit, this is the fix.
  //
  // isChildOfHeader defaults to `true` and is now left un-set (2026-09-09,
  // found live-testing ContextPanel's own mobile CSS) — it used to be
  // hardcoded `false` here for no documented reason, which silently opted
  // this SideNav out of Carbon's own `--side-nav--ux` class and, with it,
  // the built-in breakpoint-down('lg') rule that shrinks the nav to 0 width
  // below `lg`. Without that, `.cds--side-nav` stayed a persistent 48px
  // rail at every viewport, including phone widths. `.cds--content`'s own
  // margin-inline-start reservation for that rail (and the further bump to
  // 256px whenever `--side-nav--expanded`) isn't tied to the nav's actual
  // collapsed width either way — see globals.scss's own `@media (max-width:
  // 65.9375rem)` override right below the ContextPanel mobile rules, which
  // resets it to 0 since this app never uses Carbon's separate `isRail`
  // persistent-icon-rail mode the unconditional 48px assumes.
  const [sideNavExpanded, setSideNavExpanded] = useState(true);

  return (
    <PomodoroProvider>
      <Header aria-label="AORMS">
        <HeaderMenuButton
          aria-label={sideNavExpanded ? "Close menu" : "Open menu"}
          isActive={sideNavExpanded}
          isCollapsible
          onClick={() => setSideNavExpanded((v) => !v)}
        />
        <HeaderName href="/dashboard" prefix="">
          <span style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* Plain <img>, not next/image: a fixed 14KB brand asset that
                never changes doesn't need the Image optimizer. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "16px", width: "auto" }} />
            <span className="aorms-header-brand-text">Office Hub</span>
          </span>
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderEsti />
          <HeaderWellness />
          <HeaderCalculator />
          <HeaderPomodoro />
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
      <SideNav
        aria-label="Side navigation"
        expanded={sideNavExpanded}
        onOverlayClick={() => setSideNavExpanded(false)}
        onSideNavBlur={() => setSideNavExpanded(false)}
      >
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
    </PomodoroProvider>
  );
}
