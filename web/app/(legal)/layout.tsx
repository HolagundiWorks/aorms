import Link from "next/link";

/**
 * Shared shell for the Legal route group (2026-09-14, explicit
 * direction: "add legal section, add privacy policy") — /privacy and
 * /legal both render inside this one layout. Same minimal pattern as
 * app/blog/layout.tsx and app/connectdex-partners/layout.tsx: no header
 * chrome from the main site, just a way back to / and a readable
 * max-width text column (narrower than the marketing pages — this is
 * prose, not a grid layout).
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 1rem" }}>
      <header style={{ padding: "2rem 0 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="AORMS home">
          {/* Plain <img>, not next/image — a fixed brand asset. */}
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
        </Link>
        <nav aria-label="Legal pages" style={{ display: "flex", gap: "1rem" }}>
          <Link href="/privacy" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/legal" className="cds--type-body-01" style={{ color: "inherit", textDecoration: "none" }}>
            Terms of Service
          </Link>
        </nav>
      </header>
      <main style={{ paddingBottom: "4rem" }}>{children}</main>
    </div>
  );
}
