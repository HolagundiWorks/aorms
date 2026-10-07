"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Header, HeaderName, HeaderGlobalBar, HeaderMenuButton, SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem, Content } from "@carbon/react";
import { FolderDetails, Document, Information } from "@carbon/icons-react";
import { OrganisationIdentity } from "./OrganisationIdentity";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { BrandWatermark } from "./BrandWatermark";
import { TitleBlock } from "./TitleBlock";
import { CornerFigure } from "./PortalNameplate";
import { getInitials } from "../../lib/shell/identity";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";

export type PortalSection = { label: string; anchor: string };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Client Portal shell (2026-10-07) — the Office Hub's structure, scoped to a client: the firm's name leads the
 * header, the same user menu (greeting, role, sign out) sits at its right, a left icon rail expands on hover with
 * numbered sheets, an Instructions switch closes the rail, and the corner figure, title block and AORMS mark
 * frame the page. The rail lists "Your projects" and — once a project is open — that project's sections
 * (anchors on the same page, so every route stays real and deep-linkable). No staff links: no Pulse, Tasks or
 * Firm settings. Same CSS as AppShell (globals.scss keys off `.cds--side-nav ~ .cds--content`).
 */
export function PortalShell({
  children,
  portalLabel,
  homeHref,
  companyName,
  userName,
  userRole,
  istHour,
  projectSections,
  homeLabel = "Your projects",
  sectionsTitle = "This project",
  initialInstructions = true,
}: {
  children: React.ReactNode;
  portalLabel: string;
  homeHref: string;
  companyName: string;
  userName: string;
  userRole: string;
  istHour: number;
  /** Sections of an open project (or tender), linked from the rail. */
  projectSections: PortalSection[];
  /** Rail label for the portal's list page. */
  homeLabel?: string;
  /** Rail group title shown once an item is open. */
  sectionsTitle?: string;
  initialInstructions?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRailViewport, setIsRailViewport] = useState(true);
  const [instructions, setInstructions] = useState(initialInstructions);

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

  function toggleInstructions() {
    const next = !instructions;
    setInstructions(next);
    try {
      document.cookie = `${INSTRUCTIONS_COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked — it still toggles for this visit */
    }
  }

  const projectBase = new RegExp(`^${homeHref}/([^/]+)$`).exec(pathname);
  const collapseNav = () => setMobileOpen(false);

  return (
    <>
      <Header aria-label={portalLabel}>
        {!isRailViewport && <HeaderMenuButton aria-label="Open navigation" isActive={false} onClick={() => setMobileOpen(true)} />}
        <HeaderName as={NextLink} href={homeHref} prefix="" className="aorms-header-org">
          <OrganisationIdentity companyName={companyName} />
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderUserMenu name={userName} role={userRole} initials={getInitials(userName)} hour={istHour} showFirmSettings={false} />
        </HeaderGlobalBar>
      </Header>
      <SideNav aria-label="Side navigation" expanded={!isRailViewport && mobileOpen} isRail={isRailViewport} onOverlayClick={() => setMobileOpen(false)}>
        <SideNavItems>
          <SideNavLink as={NextLink} href={homeHref} renderIcon={FolderDetails} isActive={pathname === homeHref} onClick={collapseNav}>
            <span className="aorms-sheet-no">{pad(0)}</span>
            {homeLabel}
          </SideNavLink>
          {projectBase && projectSections.length > 0 && (
            <SideNavMenu title={`${pad(1)}\u2002${sectionsTitle}`} renderIcon={Document} defaultExpanded>
              {projectSections.map((s, i) => (
                <SideNavMenuItem key={s.anchor} as={NextLink} href={`${homeHref}/${projectBase[1]}#${s.anchor}`} onClick={collapseNav}>
                  <span className="aorms-sheet-no">{`${pad(1)}.${pad(i + 1)}`}</span>
                  {s.label}
                </SideNavMenuItem>
              ))}
            </SideNavMenu>
          )}
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
      <Content data-instructions={instructions ? "on" : "off"}>{children}</Content>
      <TitleBlock companyName={companyName} />
      <BrandWatermark />
    </>
  );
}
