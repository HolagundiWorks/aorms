import NextLink from "next/link";
import { platformSignOut } from "../../lib/actions/platform";
import { createClient as createPlatformClient } from "../../lib/platform/server";
import { getCurrentPlatformAccount } from "../../lib/platform/account";

/**
 * AORMS Platform — a genuinely separate portal from the firm app's own
 * Office Hub (AppShell): no SideNav, no Office Hub nav entry links here at
 * all (per explicit request — this portal is reached only by its own
 * direct URL). Covers both the login/signup pages and the signed-in
 * Identity/Licences pages; each page controls its own width (Grid/Column)
 * rather than this layout imposing one fixed size, since the login card
 * and the wider Identity/Licences content need different widths.
 *
 * Different Supabase project from web/'s own app (see lib/platform/*), so
 * this is deliberately NOT gated behind firm auth — a personal AORMS-U-
 * identity can exist independently of any one firm relationship.
 *
 * Resolves the platform session here (2026-09-09, alongside the admin
 * back office) for two reasons: (1) the "Admin" nav link only makes sense
 * to show an actual admin, and (2) fixes a bug found live in production —
 * "Sign out" rendered unconditionally regardless of whether a session
 * existed (confirmed live with zero cookies present, before this fix).
 * The web/'s own session check (getCurrentPlatformAccount, which resolves
 * through profiles.platform_public_id) tells us admin status; the
 * platform project's own session (createPlatformClient) tells us whether
 * to show "Sign out" vs "Sign in" — these are two different sessions
 * (this portal's own login is separate from the firm app's), so both
 * checks are needed rather than assuming one implies the other.
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();

  const account = user ? await getCurrentPlatformAccount() : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--cds-border-subtle)",
        }}
      >
        <NextLink href="/identity" className="cds--type-heading-compact-02" style={{ color: "inherit" }}>
          AORMS Identity
        </NextLink>
        <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <NextLink href="/identity" className="cds--type-body-01">
            Identity
          </NextLink>
          <NextLink href="/materials" className="cds--type-body-01">
            Materials
          </NextLink>
          <NextLink href="/licences" className="cds--type-body-01">
            Licences
          </NextLink>
          {account?.is_admin && (
            <NextLink href="/admin" className="cds--type-body-01">
              Admin
            </NextLink>
          )}
          {user ? (
            <form action={platformSignOut}>
              <button
                type="submit"
                className="cds--type-body-01"
                style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
              >
                Sign out
              </button>
            </form>
          ) : (
            <NextLink href="/platform-login" className="cds--type-body-01">
              Sign in
            </NextLink>
          )}
        </nav>
      </header>
      <div style={{ padding: "2rem 1rem" }}>{children}</div>
    </div>
  );
}
