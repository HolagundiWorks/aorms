import Link from "next/link";
import { MobileNavToggle } from "./MobileNavToggle";
import { ExploreDemoButton } from "./LandingButtons";

/**
 * Landing page header — 2026-09-14 landing rebuild, spec §3 nav set
 * (Product/Solutions/How It Works/ROI/Pricing/Resources/Sign In/Explore
 * Demo). Plain `next/link` throughout for the desktop nav, no Carbon
 * `Button` on the text links: this component stays a Server Component
 * intentionally — a `Button` with `renderIcon`/`as` needs a Client
 * Component wrapper (the same RSC boundary issue documented on
 * `LandingButtons.tsx`), and a header with only text links doesn't need
 * one for that part; the one real Button (Explore Demo) is isolated in
 * its own small Client Component instead of converting this whole header.
 *
 * Mobile collapse menu: `MobileNavToggle` is the one piece that needs
 * client-side state, kept in its own file for exactly that reason rather
 * than converting this whole header to a Client Component. Both navs
 * render unconditionally here; `.landing-nav-desktop`/
 * `.landing-nav-mobile-toggle` in globals.scss decide which is actually
 * visible via a media query, so there's no server/client
 * viewport-detection mismatch to worry about.
 */
export function LandingHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--cds-border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--cds-background)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0.875rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Link href="/" aria-label="AORMS home" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          {/* Plain <img>, not next/image — a fixed brand asset. */}
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
          <span
            className="cds--type-caption-01"
            style={{ color: "var(--cds-text-secondary)", borderLeft: "1px solid var(--cds-border-subtle)", paddingLeft: "0.75rem" }}
          >
            for Architecture Practices
          </span>
        </Link>
        <nav
          aria-label="Landing page sections"
          className="landing-nav-desktop"
          style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}
        >
          <Link href="#value" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Product
          </Link>
          <Link href="#pricing" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Solutions
          </Link>
          <Link href="#pulse" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            How It Works
          </Link>
          <Link href="#roi" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            ROI
          </Link>
          <Link href="#pricing" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link href="/blog" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Resources
          </Link>
          <Link href="/login" className="cds--type-body-01" style={{ textDecoration: "none", color: "var(--cds-link-primary)" }}>
            Sign in
          </Link>
          <ExploreDemoButton size="sm" />
        </nav>
        <MobileNavToggle />
      </div>
    </header>
  );
}
