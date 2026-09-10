import Link from "next/link";

/**
 * Landing page header (2026-09-10 — the page had no persistent header at
 * all before this; the wordmark only ever appeared once, inline in the
 * hero section). Plain `next/link` throughout, no Carbon `Button`: this
 * stays a Server Component intentionally — a `Button` with `renderIcon`/
 * `as` needs a Client Component wrapper (the same RSC boundary issue
 * documented on `LandingButtons.tsx`), and a header with only text links
 * doesn't need one. No mobile hamburger/collapse menu in this first pass
 * — nav links wrap on narrow viewports instead; revisit if that reads as
 * cramped rather than just compact.
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
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0.875rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
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
        <nav
          aria-label="Landing page sections"
          style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}
        >
          {/* No underlines (2026-09-10, explicit direction) — plain
              next/link anchors default to the browser's underline and
              `cds--link` (used below for Sign in) adds Carbon's own;
              textDecoration: "none" overrides both. */}
          <Link href="#brief" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Brief
          </Link>
          <Link href="#specification" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Specification
          </Link>
          <Link href="#identity" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Identity
          </Link>
          <Link href="#company" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            For Suppliers
          </Link>
          <Link href="/blog" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Blog
          </Link>
          <Link href="/login" className="cds--type-body-01" style={{ textDecoration: "none", color: "var(--cds-link-primary)" }}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
