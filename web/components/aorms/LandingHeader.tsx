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
        <Link href="/" aria-label="AORMS home" style={{ display: "flex", alignItems: "center" }}>
          {/* Plain <img>, not next/image — a fixed brand asset. */}
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
        </Link>
        <nav
          aria-label="Landing page sections"
          style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}
        >
          <Link href="#brief" className="cds--type-body-01" style={{ color: "inherit" }}>
            Brief
          </Link>
          <Link href="#specification" className="cds--type-body-01" style={{ color: "inherit" }}>
            Specification
          </Link>
          <Link href="#identity" className="cds--type-body-01" style={{ color: "inherit" }}>
            Identity
          </Link>
          <Link href="#company" className="cds--type-body-01" style={{ color: "inherit" }}>
            For Suppliers
          </Link>
          <Link href="/blog" className="cds--type-body-01" style={{ color: "inherit" }}>
            Blog
          </Link>
          <Link href="/login" className="cds--link">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
