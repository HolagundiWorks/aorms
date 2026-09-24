"use client";

import { useEffect, useState, type ComponentType } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  Content,
} from "@carbon/react";
import {
  Activity,
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
  RequestQuote,
} from "@carbon/icons-react";
import { PomodoroProvider } from "./pomodoro/PomodoroContext";
import { HeaderPomodoro } from "./pomodoro/HeaderPomodoro";
import { HeaderCalculator } from "./calculator/HeaderCalculator";
import { HeaderWellness } from "./wellness/HeaderWellness";
import { HeaderEsti } from "./esti/HeaderEsti";
import { OrganisationIdentity } from "./OrganisationIdentity";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { BrandWatermark } from "./BrandWatermark";
import { FloatingAskPulse } from "./pulse/FloatingAskPulse";
import { getInitials } from "../../lib/shell/identity";

type NavLeaf = { href: string; label: string };
type NavGroup = { title: string; icon: ComponentType; items: NavLeaf[] };

/**
 * Top-level items (always visible, no group) — 2026-09-14 remediation
 * (attached IA brief §3-4): Pulse is now the office hub's home (merged
 * with the old Dashboard — see app/(app)/pulse/page.tsx's own header
 * comment), so "Dashboard" is gone as a separate nav item entirely, not
 * just renamed. Leads and Tasks stay top-level — real, working pillars
 * the brief doesn't mention moving, not touched. Clients moved into the
 * new Third Parties group below (brief §8).
 *
 * Pulse's icon: `Activity` (not `Dashboard`) — reassigned back
 * (2026-09-14, explicit request) after a same-day detour through
 * `Dashboard` to resolve a collision with Wellbeing's own icon, which
 * also used `Activity` at the time. Wellbeing now uses `Favorite`
 * instead (HeaderWellness.tsx) so `Activity` is Pulse's alone — a
 * pulse/heartbeat glyph is arguably the more apt icon for a page
 * literally named Pulse anyway.
 */
const TOP_LEVEL: (NavLeaf & { icon: ComponentType })[] = [
  { href: "/pulse", label: "Pulse", icon: Activity },
  { href: "/projects", label: "Projects", icon: FolderDetails },
  { href: "/leads", label: "Leads", icon: UserFollow },
  { href: "/tasks", label: "Tasks", icon: Task },
];

/**
 * Grouped by domain. 2026-09-14 remediation (attached IA brief §3-14):
 * restructured around the brief's own target hierarchy — Site, Third
 * Parties, Accounts, HR, Tender Management, Knowledge Bank, in that
 * order, each either a rename of an existing group (Delivery -> Site,
 * Finance -> Accounts, People -> HR, Library -> Knowledge Bank) or new
 * (Third Parties pools Clients/Contractors/Consultants under one group
 * per the brief's own "a third party should be capable of having more
 * than one role" model — see § 9; genuinely consolidating the *nav*
 * position, not the underlying data model, which stays three separate
 * tables per clients/contractors/consultants.sql — a real schema
 * unification is a bigger, separate change not attempted here. Tender
 * Management pulls /tenders out of Office, its own group per the brief
 * even though nothing else in that brief's fuller Tender Management
 * structure — BOQ, rate analysis, bid comparison — exists as separate
 * pages yet). Office/Estimation & Technical/Admin keep their existing
 * shape and move after the brief's own 8 primary groups — every one of
 * their pages is real, working functionality the brief doesn't address,
 * not deleted or force-fit into an ill-suited category; "Vendors" from
 * the brief's own Third Parties structure isn't added here either — no
 * vendors table/pages exist yet, that's new-entity work, not a nav move
 * (see docs/esti/ROADMAP.md's own dated entry for this as a disclosed
 * follow-up).
 */
const GROUPS: NavGroup[] = [
  {
    title: "Site",
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
      { href: "/approvals", label: "Approvals" },
    ],
  },
  {
    title: "Third Parties",
    icon: Building,
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/contractors", label: "Contractors" },
      { href: "/consultants", label: "Consultants" },
    ],
  },
  {
    title: "Accounts",
    icon: Currency,
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/reports", label: "Financial Reports" },
      { href: "/accounts", label: "Office Expenses" },
      { href: "/reconcile", label: "Reconciliation" },
    ],
  },
  {
    title: "HR",
    icon: Group,
    items: [
      { href: "/team-members", label: "Team Members" },
      { href: "/teams", label: "Teams" },
      { href: "/payslips", label: "Payslips" },
      { href: "/job-applications", label: "Job Applications" },
    ],
  },
  {
    title: "Tender Management",
    icon: RequestQuote,
    items: [{ href: "/tenders", label: "Tenders" }],
  },
  {
    title: "Knowledge Bank",
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
    title: "Office",
    icon: Document,
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
    title: "Admin",
    icon: Settings,
    items: [
      { href: "/workload", label: "Workload" },
      { href: "/audit-log", label: "Audit Log" },
      { href: "/users", label: "Users" },
      { href: "/firm-settings", label: "Firm Settings" },
      { href: "/ai-devices", label: "Esti Devices" },
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

/**
 * The shell's side nav has exactly one authoritative piece of state
 * (`sideNavExpanded` below) — never duplicated or tracked separately
 * anywhere else in the tree. It's a plain boolean at runtime because
 * that's all Carbon's own `SideNav` prop takes, but it actually means one
 * of four distinct states once combined with the viewport width (Carbon's
 * own `lg` = 66rem breakpoint, via `isPersistent`/`--side-nav--ux` below):
 *
 *   expanded       — sideNavExpanded=true  above lg  (full 256px width,
 *                    labels + icons)
 *   collapsed      — sideNavExpanded=false above lg  (icon rail, 48px —
 *                    `isRail` below; temporarily re-expands on hover/
 *                    focus via Carbon's own internal hover state, then
 *                    collapses back on mouse-leave/blur)
 *   mobile-open    — sideNavExpanded=true  at/below lg (dismissible
 *                    overlay, backdrop visible, full width — rail is
 *                    disabled below lg, see globals.scss)
 *   mobile-closed  — sideNavExpanded=false at/below lg (nav is 0-width,
 *                    off-canvas)
 *
 * 2026-09-13 correction: this used to say "there is no icon rail mode in
 * this app" and treated collapsed/expanded as reading identically on
 * desktop by design — reported back live as "side panel is not collapsing
 * into icons," i.e. that reading was wrong, not a deliberate choice the
 * user wanted. `isRail` (Carbon's own prop for exactly this) is now set
 * below; see globals.scss's own comment for why it needs an explicit
 * below-`lg` override (`--side-nav--rail`'s 48px has no breakpoint gate of
 * its own, unlike `--side-nav--ux`'s, so without that override rail width
 * would also apply on mobile where the nav is meant to be an overlay).
 *
 * 2026-09-20 correction (QA bug B5): the claim above — "rail is disabled
 * below lg, see globals.scss" — was only half true. globals.scss's
 * override only forced the *closed* rail state to 0 width; it never
 * covered the mobile-open case, so `isRail` being passed unconditionally
 * meant a mobile viewport's "expanded" nav rendered as
 * `.cds--side-nav--rail.cds--side-nav--expanded` — the same persistent
 * 256px panel desktop's collapsed-rail-hover-preview uses, not a proper
 * overlay — squeezing page content into a narrow column with truncated
 * labels. `isRail` is now itself viewport-conditional (`isRailViewport`
 * below, via `matchMedia("(min-width: 66rem)")`, the same `lg` threshold):
 * true only above `lg`, where the icon-rail concept applies at all; false
 * below it, so mobile gets Carbon's own default `--side-nav--ux`
 * dismissible-overlay behavior instead. `sideNavExpanded` also now
 * defaults closed the first time a mobile viewport is detected (a
 * hamburger menu should start closed, not cover the screen on load).
 */
export function AppShell({
  children,
  companyName,
  userName,
  userRole,
  istHour,
  projects,
  hasMultipleStudios,
}: {
  children: React.ReactNode;
  /** From firms.company_name (app/(app)/layout.tsx) — see OrganisationIdentity.tsx for the fallback when unset. */
  companyName: string;
  /** From profiles.full_name — falls back to "there" (as in "Good evening, there") for the rare profile with no name set yet, rather than showing an empty greeting. */
  userName: string;
  /** From profiles.role, human-readable (role-home.ts / rank.ts's own ROLE_LABEL, see app/(app)/layout.tsx). */
  userRole: string;
  /** IST hour (0-23), computed server-side in app/(app)/layout.tsx via lib/shell/identity.ts's getIstHour() — passed down rather than computed here so a client-side re-render can't drift from the server-rendered greeting. */
  istHour: number;
  /** For FloatingAskPulse.tsx's own project selector (app/(app)/layout.tsx). */
  projects: { id: string; title: string }[];
  /** True when this profile belongs to more than one firm (profile_firm_memberships, migration 0055) — shows "Switch studio" in the user menu. */
  hasMultipleStudios?: boolean;
}) {
  const pathname = usePathname();
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

  // B5 fix (2026-09-20 QA) — `isRail` below used to be passed
  // unconditionally, on every viewport including mobile. Carbon's rail
  // mode (`.cds--side-nav--rail`) is a desktop-only concept — a
  // persistently docked icon rail that expands on hover — and forcing it
  // below the `lg` breakpoint (66rem, the same threshold globals.scss's
  // own `@media (max-width: 65.9375rem)` override already targets) opted
  // the nav out of Carbon's default dismissible-overlay mobile behavior
  // entirely: at 375px the nav rendered as a persistent, non-overlay
  // `.cds--side-nav--rail.cds--side-nav--expanded` panel — which Carbon
  // styles at the same 256px `.cds--side-nav--expanded` width as the full
  // desktop nav (@carbon/styles' own ui-shell/side-nav/_side-nav.scss) —
  // pushing content into a narrow column with mid-word-truncated labels,
  // instead of collapsing to a true hamburger-triggered overlay. Tracked
  // via `matchMedia` rather than CSS alone since `isRail` is a React prop
  // Carbon uses to choose which classes to render in the first place, not
  // something a stylesheet can override after the fact. SSR has no
  // viewport info, so the initial value assumes desktop (matching the
  // unconditional `isRail` this replaces) and corrects on mount.
  const [isRailViewport, setIsRailViewport] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 66rem)");
    setIsRailViewport(mql.matches);
    // Default the nav closed the moment we learn this is actually a
    // mobile viewport — a hamburger menu should start closed, not cover
    // the whole screen on first load. Only forced once, on mount, so a
    // later resize across the breakpoint doesn't fight a manual toggle.
    if (!mql.matches) setSideNavExpanded(false);

    const onChange = (e: MediaQueryListEvent) => setIsRailViewport(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Closes the nav after any link click. Above the ~66rem breakpoint the
  // nav's own CSS ignores `expanded` and stays fixed-open regardless (see
  // the comment on the state above) — so this call is a no-op on desktop
  // and only actually does anything below that breakpoint, where the nav
  // is a dismissible overlay: without it, tapping a link left the overlay
  // sitting open over the newly-navigated page until the user separately
  // clicked the overlay backdrop or the menu button. Real bug, not
  // cosmetic — found live (nav didn't auto-collapse after navigating).
  function collapseNav() {
    setSideNavExpanded(false);
  }

  return (
    <PomodoroProvider>
      <Header aria-label="AORMS">
        <HeaderMenuButton
          aria-label={sideNavExpanded ? "Close menu" : "Open menu"}
          isActive={sideNavExpanded}
          isCollapsible
          onClick={() => setSideNavExpanded((v) => !v)}
        />
        {/* AORMS logo/wordmark removed from the header entirely
            (2026-09-14, explicit request, same day as adding it) — the
            header now leads with the firm's own name instead
            (OrganisationIdentity, single line, no tagline); the AORMS
            mark's new home is BrandWatermark.tsx, a small fixed mark in
            the page's bottom-right corner, rendered once below. */}
        <HeaderName href="/pulse" prefix="" className="aorms-header-org">
          <OrganisationIdentity companyName={companyName} />
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderEsti />
          <HeaderWellness />
          <HeaderCalculator />
          <HeaderPomodoro />
          {/* User identity + greeting + avatar + menu (spec §5-8) —
              replaces the old standalone icon-only Sign-out action;
              Sign out now lives inside this menu (HeaderUserMenu.tsx).
              Role text was removed from the always-visible trigger
              (2026-09-14, explicit request) — it still appears inside
              the opened dropdown, which isn't visible header clutter. */}
          <HeaderUserMenu
            name={userName}
            role={userRole}
            initials={getInitials(userName)}
            hour={istHour}
            hasMultipleStudios={hasMultipleStudios}
          />
        </HeaderGlobalBar>
      </Header>
      <SideNav
        aria-label="Side navigation"
        expanded={sideNavExpanded}
        isRail={isRailViewport}
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
              onClick={collapseNav}
            >
              {item.label}
            </SideNavLink>
          ))}
          {GROUPS.map((group) => {
            const groupIsActive = group.items.some((item) => isActiveHref(pathname, item.href));
            return (
              <SideNavMenu key={group.title} title={group.title} renderIcon={group.icon} defaultExpanded={groupIsActive}>
                {group.items.map((item) => (
                  <SideNavMenuItem key={item.href} as={NextLink} href={item.href} isActive={isActiveHref(pathname, item.href)} onClick={collapseNav}>
                    {item.label}
                  </SideNavMenuItem>
                ))}
              </SideNavMenu>
            );
          })}
        </SideNavItems>
      </SideNav>
      <Content>{children}</Content>
      <FloatingAskPulse projects={projects} />
      <BrandWatermark />
    </PomodoroProvider>
  );
}
