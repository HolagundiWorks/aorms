import NextLink from "next/link";
import { Header, HeaderName, HeaderNavigation, HeaderMenuItem } from "@carbon/react";
import { platformSignOut } from "../../../lib/actions/platform";
import { getPlatformNavStatus } from "../../../lib/platform/account";
import { portalUrl } from "../../../lib/platform/subdomains";
import { getGreeting, getIstHour, getInitials, getFirstName } from "../../../lib/shell/identity";
import { IdleSessionGuard } from "../security/IdleSessionGuard";

export type PlatformNavItem = { href: string; label: string; superAdminOnly?: boolean };

/**
 * Shared AORMS Platform portal header (2026-09-14 shell/branding
 * remediation — see docs/esti/AORMS-WEB-BRANDING-GUIDE.md § 4) — one
 * Carbon UI Shell header (`Header`/`HeaderName`/`HeaderNavigation`/
 * `HeaderMenuItem`) all three portals render, replacing the three
 * separately hand-rolled `<header>`+flexbox bars
 * `components/aorms/platform/PortalHeaders.tsx` used to define. Each
 * portal supplies only what's genuinely its own (name, tagline, home,
 * nav links); the identity-block anatomy (leading name+tagline,
 * trailing greeting+avatar+sign-out) is identical across all three,
 * matching Office Hub's own header conventions
 * (lib/shell/identity.ts's greeting/initials helpers are the exact same
 * ones AppShell.tsx/HeaderUserMenu.tsx use) without forcing an identical
 * SideNav these portals' much smaller link counts don't need — see the
 * branding guide's own § 4 table for why that's a deliberate difference,
 * not an inconsistency.
 */
export async function PlatformShellHeader({
  portalName,
  tagline,
  homeHref,
  navItems,
  showSysDexLink = true,
}: {
  portalName: string;
  tagline: string;
  homeHref: string;
  navItems: PlatformNavItem[];
  showSysDexLink?: boolean;
}) {
  const { signedIn, isAdmin, isSuperAdmin, displayName } = await getPlatformNavStatus();
  const greeting = getGreeting(getIstHour());
  const firstName = getFirstName(displayName);
  const initials = getInitials(displayName);

  return (
    <Header aria-label={portalName}>
      {signedIn && <IdleSessionGuard signOutAction={platformSignOut} />}
      {/* prefix="" explicitly, not omitted — Carbon's HeaderName
          defaults to prefix="IBM" when the prop isn't given at all
          (found live: "IBM Identity Portal"). No prefix at all here
          (not "AORMS" either — found live it doubled to "AORMS AORMS
          Identity Portal" for the one portal whose own name already
          said AORMS): matching Office Hub's own header, AORMS itself
          lives only in BrandWatermark.tsx, never spelled out in a
          portal's own header text. */}
      <HeaderName href={homeHref} prefix="">
        {portalName}
      </HeaderName>
      {/* aorms-platform-tagline: hidden below ~480px (globals.scss) once
          the nav-visibility fix below made `.cds--header__nav` compete for
          the same header row on narrow phones — this purely decorative
          text was crowding the functional Identity/Licences links into a
          narrower, more-scrolled nav than necessary. Never hidden above
          that width. */}
      <span
        className="cds--type-helper-text-01 aorms-platform-tagline"
        style={{ color: "var(--cds-text-secondary)", marginLeft: "0.75rem", whiteSpace: "nowrap" }}
      >
        {tagline}
      </span>
      {/* Plain `href`, no `as={NextLink}` — HeaderMenuItem is a Client
          Component and this header itself is a Server Component;
          passing a component reference as a prop across that boundary
          isn't serializable (found live: "Functions cannot be passed
          directly to Client Components"). A plain anchor (full
          navigation on click, not Next's client-side transition) is a
          fine trade for these portals' own few, low-traffic links. */}
      <HeaderNavigation aria-label={`${portalName} navigation`}>
        {navItems
          .filter((item) => !item.superAdminOnly || isSuperAdmin)
          .map((item) => (
            <HeaderMenuItem key={item.href} href={item.href}>
              {item.label}
            </HeaderMenuItem>
          ))}
        {isAdmin && showSysDexLink && <HeaderMenuItem href={portalUrl("sysdex", "/admin")}>SysDeX</HeaderMenuItem>}
      </HeaderNavigation>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto", paddingRight: "1rem" }}>
        {signedIn ? (
          <>
            <span className="cds--type-body-compact-01" style={{ whiteSpace: "nowrap" }}>
              {greeting}, {firstName}
            </span>
            <span
              aria-hidden
              className="cds--type-label-01"
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "var(--cds-background-selected)",
                color: "var(--cds-text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <strong>{initials}</strong>
            </span>
            <form action={platformSignOut}>
              <button
                type="submit"
                className="cds--type-body-01"
                style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <NextLink href="/platform-login" className="cds--type-body-01">
            Sign in
          </NextLink>
        )}
      </div>
    </Header>
  );
}
