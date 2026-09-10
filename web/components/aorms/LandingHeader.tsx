import Link from "next/link";
import { MobileNavToggle } from "./MobileNavToggle";

/**
 * Landing page header (2026-09-10 — the page had no persistent header at
 * all before this; the wordmark only ever appeared once, inline in the
 * hero section). Plain `next/link` throughout for the desktop nav, no
 * Carbon `Button`: this component stays a Server Component intentionally
 * — a `Button` with `renderIcon`/`as` needs a Client Component wrapper
 * (the same RSC boundary issue documented on `LandingButtons.tsx`), and
 * a header with only text links doesn't need one for the desktop case.
 *
 * Mobile collapse menu added 2026-09-10 (feedback: text links just
 * wrapped onto extra lines on a narrow viewport, no real toggle) —
 * `MobileNavToggle` is the one piece that needs client-side state, kept
 * in its own file for exactly that reason rather than converting this
 * whole header to a Client Component. Both navs render unconditionally
 * here; `.landing-nav-desktop`/`.landing-nav-mobile-toggle` in
 * globals.scss decide which is actually visible via a media query, so
 * there's no server/client viewport-detection mismatch to worry about.
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
          {/* Explicit direction (2026-09-10) — the header previously said
              nothing about who this is for at all, logo + nav links only. */}
          <span
            className="cds--type-caption-01"
            style={{ color: "var(--cds-text-secondary)", borderLeft: "1px solid var(--cds-border-subtle)", paddingLeft: "0.75rem" }}
          >
            for Architecture Practices
          </span>
        </Link>
        {/* Simplified to 4 items with literal "|" separators (2026-09-10,
            explicit direction: "Architect | ConnectDeX | Blog | Signin")
            — was 6 separate links (Brief/Specification/Identity/For
            Suppliers/Blog/Sign in). "Architect" points at #identity (the
            architect-facing Individual/Studio explanation) and
            "ConnectDeX" at #connectdex (renamed from #company/"For
            Suppliers" — see marketing-content.ts's CONNECTDEX constant) —
            the two now read as a deliberate pair: one link per audience
            this Platform actually serves. Brief/Specification are still
            real sections on the page, just no longer linked directly from
            the header; a visitor reaches them by scrolling or via
            #identity's own surrounding content. */}
        <nav
          aria-label="Landing page sections"
          className="landing-nav-desktop"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
        >
          <Link href="#identity" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Architect
          </Link>
          <span aria-hidden className="cds--type-body-01" style={{ color: "var(--cds-border-subtle)" }}>
            |
          </span>
          <Link href="#connectdex" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            ConnectDeX
          </Link>
          <span aria-hidden className="cds--type-body-01" style={{ color: "var(--cds-border-subtle)" }}>
            |
          </span>
          <Link href="/blog" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Blog
          </Link>
          <span aria-hidden className="cds--type-body-01" style={{ color: "var(--cds-border-subtle)" }}>
            |
          </span>
          <Link href="/login" className="cds--type-body-01" style={{ textDecoration: "none", color: "var(--cds-link-primary)" }}>
            Sign in
          </Link>
        </nav>
        <MobileNavToggle />
      </div>
    </header>
  );
}
