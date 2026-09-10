import Link from "next/link";

/**
 * Minimal blog shell — no route group, sits directly under the root
 * layout (plain html/body, no header/nav of its own — same as app/page.tsx).
 * Just a small header linking back to / (2026-09-10, same "no way back to
 * home" gap fixed on the login pages) and a max-width content column
 * matching the landing page's own visual language, without pulling in
 * that page's full section/CTA apparatus.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 1rem" }}>
      <header style={{ padding: "2rem 0 1rem" }}>
        <Link href="/" aria-label="AORMS home">
          {/* Plain <img>, not next/image — a fixed brand asset. */}
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
        </Link>
      </header>
      <main style={{ paddingBottom: "4rem" }}>{children}</main>
    </div>
  );
}
