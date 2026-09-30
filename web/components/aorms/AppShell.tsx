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
 * Group order (2026-09-30 UI/UX audit — hierarchy): groups now run from the
 * day-to-day project workflow outward — Site and Estimation & Technical (the
 * work itself, previously buried second-to-last) → Third Parties, Tender
 * Management, Office and Accounts (commercial) → HR (people) → Knowledge Bank
 * (reference) → Admin (configuration, last). The "Knowledge Bank" page inside
 * the Knowledge Bank group is relabelled "Knowledge Portal" so a group and its
 * own child no longer share a name.
 *
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
    title: "Third Parties",
    icon: Building,
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/contractors", label: "Contractors" },
      { href: "/consultants", label: "Consultants" },
    ],
  },
  {
    title: "Tender Management",
    icon: RequestQuote,
    items: [{ href: "/tenders", label: "Tenders" }],
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
    title: "Knowledge Bank",
    icon: Book,
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
 * Side nav states (2026-09-30 redesign; the old four-state table — with a
 * desktop expand/collapse toggle — is gone):
 *
 *   desktop (>= lg, 66rem) — always the 48px icon rail. Hover / keyboard focus
 *                            expands it to 256px as an overlay (content does
 *                            not move); leaving collapses it. No toggle button.
 *   mobile  (<  lg)        — off-canvas overlay, opened by the header
 *                            hamburger (`mobileOpen`), closed by the backdrop
 *                            or by picking a link. `isRail` is false here
 *                            (QA B5: rail mode on mobile rendered a persistent
 *                            256px panel instead of an overlay).
 *
 * The content-margin rules that pin this live in globals.scss.
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
  //
  // 2026-09-30 redesign (explicit request: "the sidebar on hover extends and
  // collapses by default, no close button, and the width of content is not
  // getting set"). Desktop (>= lg, 66rem): the nav is ALWAYS the 48px icon
  // rail; hovering or keyboard-focusing it expands it to full width as an
  // overlay (Carbon's own rail behaviour) and it collapses again on leave.
  // There is no toggle/close button on desktop, and `sideNavExpanded` no
  // longer exists — the only state is `mobileOpen`, used below lg where the
  // nav is an off-canvas overlay opened by the header hamburger and closed by
  // tapping the backdrop or a link. The content margin is pinned to the rail
  // width in globals.scss, so hovering the nav never reflows the page (it
  // used to jump to 256px, and the nav also started expanded, which is why
  // the content width looked unset).
  const [mobileOpen, setMobileOpen] = useState(false);

  // `isRail` is viewport-conditional (QA bug B5, 2026-09-20): Carbon's rail is
  // a desktop-only concept; below lg it must be the default dismissible
  // overlay. SSR has no viewport info, so assume desktop and correct on mount.
  const [isRailViewport, setIsRailViewport] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 66rem)");
    setIsRailViewport(mql.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsRailViewport(e.matches);
      if (e.matches) setMobileOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Below lg, close the overlay after any link click so it doesn't sit over
  // the newly-navigated page. A no-op on desktop (the rail collapses itself
  // when the pointer leaves).
  function collapseNav() {
    setMobileOpen(false);
  }

  return (
    <PomodoroProvider>
      <Header aria-label="AORMS">
        {/* Mobile-only opener. Desktop has no toggle at all (the rail
            expands on hover). Never shows an X/"Close" state — the overlay
            closes via its backdrop or by choosing a link. */}
        {!isRailViewport && (
          <HeaderMenuButton aria-label="Open navigation" isActive={false} onClick={() => setMobileOpen(true)} />
        )}
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
        expanded={!isRailViewport && mobileOpen}
        isRail={isRailViewport}
        onOverlayClick={() => setMobileOpen(false)}
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
