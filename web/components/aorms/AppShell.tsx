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
  Information,
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
import { NAV_GROUPS, NAV_TOP, groupSheet, itemSheet, topSheet } from "../../lib/shell/nav-data";
import { TitleBlock } from "./TitleBlock";
import { CornerFigure } from "./PortalNameplate";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";


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
const TOP_ICONS: Record<string, ComponentType> = {
  "/pulse": Activity,
  "/projects": FolderDetails,
  "/leads": UserFollow,
  "/tasks": Task,
};

const GROUP_ICONS: Record<string, ComponentType> = {
  "Site": DeliveryIcon,
  "Estimation & Tech": Ruler,
  "Third Parties": Building,
  "Tender Management": RequestQuote,
  "Office": Document,
  "Accounts": Currency,
  "HR": Group,
  "Knowledge Bank": Book,
  "Admin": Settings,
};

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
  initialInstructions = true,
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
  /** Whether "how to use" notes are shown (cookie-backed, read server-side so there is no flash). Defaults on. */
  initialInstructions?: boolean;
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

  // Instructions toggle (side panel): page descriptions, "The result" lines and
  // drag/drop hints are all marked `.aorms-instruction` and hidden by CSS when
  // this is off (see globals.scss). On by default — that is the existing
  // behaviour — and remembered in a cookie the layout reads on the next request.
  const [instructions, setInstructions] = useState(initialInstructions);
  function toggleInstructions() {
    const next = !instructions;
    setInstructions(next);
    try {
      document.cookie = `${INSTRUCTIONS_COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked — it still toggles for this visit */
    }
  }

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
          {NAV_TOP.map((item, i) => (
            <SideNavLink
              key={item.href}
              as={NextLink}
              href={item.href}
              renderIcon={TOP_ICONS[item.href]}
              isActive={isActiveHref(pathname, item.href)}
              onClick={collapseNav}
            >
              <span className="aorms-sheet-no">{topSheet(i)}</span>
              {item.label}
            </SideNavLink>
          ))}
          {NAV_GROUPS.map((group, gi) => {
            const groupIsActive = group.items.some((item) => isActiveHref(pathname, item.href));
            return (
              <SideNavMenu
                key={group.title}
                title={`${groupSheet(gi)}\u2002${group.title}`}
                renderIcon={GROUP_ICONS[group.title]}
                defaultExpanded={groupIsActive}
              >
                {group.items.map((item, ii) => (
                  <SideNavMenuItem key={item.href} as={NextLink} href={item.href} isActive={isActiveHref(pathname, item.href)} onClick={collapseNav}>
                    <span className="aorms-sheet-no">{itemSheet(gi, ii)}</span>
                    {item.label}
                  </SideNavMenuItem>
                ))}
              </SideNavMenu>
            );
          })}
          {/* Instructions toggle — the last entry of the side panel. */}
          <SideNavLink
            href="#instructions"
            renderIcon={Information}
            isActive={instructions}
            role="switch"
            aria-checked={instructions}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              toggleInstructions();
            }}
          >
            Instructions · {instructions ? "On" : "Off"}
          </SideNavLink>
        </SideNavItems>
      </SideNav>
      <CornerFigure />
      <Content data-instructions={instructions ? "on" : "off"}>
        {children}
      </Content>
      <TitleBlock companyName={companyName} />
      <FloatingAskPulse projects={projects} />
      <BrandWatermark />
    </PomodoroProvider>
  );
}
