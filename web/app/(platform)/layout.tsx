import NextLink from "next/link";
import { platformSignOut } from "../../lib/actions/platform";

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
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
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
          <form action={platformSignOut}>
            <button
              type="submit"
              className="cds--type-body-01"
              style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div style={{ padding: "2rem 1rem" }}>{children}</div>
    </div>
  );
}
