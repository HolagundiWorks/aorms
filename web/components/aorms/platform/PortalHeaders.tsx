import { PlatformShellHeader } from "./PlatformShellHeader";

/**
 * The three AORMS Platform portal headers (2026-09-10; rebuilt on the
 * shared `PlatformShellHeader` 2026-09-14 — see
 * docs/esti/AORMS-WEB-BRANDING-GUIDE.md § 4) — see
 * docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals for the
 * naming/audience rationale. Each page renders exactly one of these,
 * right above its own `PageHeader` — not a layout-level thing, since the
 * three portals have genuinely distinct nav, not just a different title.
 * All the actual header anatomy (logo/name/tagline, nav, greeting,
 * avatar, sign-in/out) now lives once in PlatformShellHeader.tsx; these
 * three functions just supply each portal's own name/tagline/links.
 */

export function IdentityPortalHeader() {
  return (
    <PlatformShellHeader
      portalName="Identity Portal"
      tagline="For architects & Studios"
      homeHref="/identity"
      navItems={[
        { href: "/identity", label: "Identity" },
        { href: "/licences", label: "Licences" },
      ]}
    />
  );
}

export function ConnectDexPortalHeader() {
  return (
    <PlatformShellHeader
      portalName="ConnectDeX Portal"
      tagline="For material & interior suppliers"
      homeHref="/connectdex"
      navItems={[
        { href: "/connectdex", label: "My Company" },
        { href: "/materials", label: "Materials" },
        { href: "/connectdex-apply", label: "Apply" },
      ]}
    />
  );
}

export function SysDexPortalHeader() {
  return (
    <PlatformShellHeader
      portalName="SysDeX"
      tagline="Platform administration"
      homeHref="/admin"
      showSysDexLink={false}
      navItems={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/accounts", label: "Accounts", superAdminOnly: true },
        { href: "/admin/licences", label: "Licences", superAdminOnly: true },
        { href: "/admin/payments", label: "Payments", superAdminOnly: true },
        { href: "/admin/pricing", label: "Pricing", superAdminOnly: true },
        { href: "/admin/connectdex", label: "ConnectDeX", superAdminOnly: true },
        { href: "/admin/ai-connectors", label: "AI Connectors", superAdminOnly: true },
        { href: "/admin/helpdesk", label: "HelpDeX" },
        { href: "/admin/logs", label: "Logs", superAdminOnly: true },
      ]}
    />
  );
}
