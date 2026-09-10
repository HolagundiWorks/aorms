import NextLink from "next/link";
import { platformSignOut } from "../../../lib/actions/platform";
import { getPlatformNavStatus } from "../../../lib/platform/account";
import { portalUrl } from "../../../lib/platform/subdomains";

/**
 * The three AORMS Platform portal headers (2026-09-10) — see
 * docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals for the
 * naming/audience rationale. Replaces the single undifferentiated header
 * `(platform)/layout.tsx` used to render for every page regardless of
 * audience. Each page renders exactly one of these, right above its own
 * `PageHeader` — not a layout-level thing, since the three portals have
 * genuinely distinct nav, not just a different title.
 *
 * All three share one small nav-status lookup (`getPlatformNavStatus`,
 * resolved via the Platform's OWN session — see lib/platform/account.ts's
 * header comment on why admin gating specifically needed its own
 * session-based resolver rather than piggybacking on the Office-Hub-link
 * one) so a signed-in platform admin sees a "SysDeX" cross-link from the
 * other two portals, and everyone sees an accurate Sign in/out control.
 */

const barStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "1rem 1.5rem",
  borderBottom: "1px solid var(--cds-border-subtle)",
};

const navStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "1.5rem" };

function SignInOut({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
    return (
      <NextLink href="/platform-login" className="cds--type-body-01">
        Sign in
      </NextLink>
    );
  }
  return (
    <form action={platformSignOut}>
      <button
        type="submit"
        className="cds--type-body-01"
        style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
      >
        Sign out
      </button>
    </form>
  );
}

function Brand({ href, name, tagline }: { href: string; name: string; tagline: string }) {
  return (
    <NextLink href={href} style={{ color: "inherit", textDecoration: "none" }}>
      <div className="cds--type-heading-compact-02">{name}</div>
      <div className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
        {tagline}
      </div>
    </NextLink>
  );
}

export async function IdentityPortalHeader() {
  const { signedIn, isAdmin } = await getPlatformNavStatus();
  return (
    <header style={barStyle}>
      <Brand href="/identity" name="AORMS Identity Portal" tagline="For architects & Studios" />
      <nav style={navStyle}>
        <NextLink href="/identity" className="cds--type-body-01">
          Identity
        </NextLink>
        <NextLink href="/licences" className="cds--type-body-01">
          Licences
        </NextLink>
        {isAdmin && (
          <NextLink href={portalUrl("sysdex", "/admin")} className="cds--type-body-01">
            SysDeX
          </NextLink>
        )}
        <SignInOut signedIn={signedIn} />
      </nav>
    </header>
  );
}

export async function ConnectDexPortalHeader() {
  const { signedIn, isAdmin } = await getPlatformNavStatus();
  return (
    <header style={barStyle}>
      <Brand href="/connectdex" name="ConnectDeX Portal" tagline="For material & interior suppliers" />
      <nav style={navStyle}>
        <NextLink href="/connectdex" className="cds--type-body-01">
          My Company
        </NextLink>
        <NextLink href="/materials" className="cds--type-body-01">
          Materials
        </NextLink>
        <NextLink href="/connectdex-apply" className="cds--type-body-01">
          Apply
        </NextLink>
        {isAdmin && (
          <NextLink href={portalUrl("sysdex", "/admin")} className="cds--type-body-01">
            SysDeX
          </NextLink>
        )}
        <SignInOut signedIn={signedIn} />
      </nav>
    </header>
  );
}

export async function SysDexPortalHeader() {
  const { signedIn, isSuperAdmin } = await getPlatformNavStatus();
  return (
    <header style={barStyle}>
      <Brand href="/admin" name="SysDeX" tagline="Platform administration" />
      <nav style={{ ...navStyle, flexWrap: "wrap", rowGap: "0.5rem" }}>
        <NextLink href="/admin" className="cds--type-body-01">
          Dashboard
        </NextLink>
        {isSuperAdmin && (
          <>
            <NextLink href="/admin/accounts" className="cds--type-body-01">
              Accounts
            </NextLink>
            <NextLink href="/admin/licences" className="cds--type-body-01">
              Licences
            </NextLink>
            <NextLink href="/admin/payments" className="cds--type-body-01">
              Payments
            </NextLink>
            <NextLink href="/admin/pricing" className="cds--type-body-01">
              Pricing
            </NextLink>
            <NextLink href="/admin/connectdex" className="cds--type-body-01">
              ConnectDeX
            </NextLink>
          </>
        )}
        <NextLink href="/admin/helpdesk" className="cds--type-body-01">
          HelpDeX
        </NextLink>
        {isSuperAdmin && (
          <NextLink href="/admin/logs" className="cds--type-body-01">
            Logs
          </NextLink>
        )}
        <SignInOut signedIn={signedIn} />
      </nav>
    </header>
  );
}
