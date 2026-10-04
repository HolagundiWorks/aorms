"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The public (signed-out) sheets, in order — landing is sheet 00 and lives in app/page.tsx. */
const PUBLIC_SHEETS = [
  { href: "/", sheet: "00", section: "The start", page: "Landing" },
  { href: "/connectdex-partners", sheet: "P-01", section: "Partners", page: "ConnectDeX" },
  { href: "/blog", sheet: "B-01", section: "Blog", page: "Notes" },
  { href: "/privacy", sheet: "L-01", section: "Legal", page: "Privacy" },
  { href: "/legal", sheet: "L-02", section: "Legal", page: "Terms" },
];

const NAV = [
  { href: "/connectdex-partners", label: "Partners" },
  { href: "/blog", label: "Blog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "Terms" },
  { href: "/login", label: "Sign in" },
];

/**
 * Shared shell for the public content pages (blog, ConnectDeX Partners, legal) — 2026-10-04.
 * Brings them onto the landing page's sheet language: logo + mono link row on the left, the
 * right-hand sheet nameplate (≥ 90rem, `.aorms-np`) with the sheet's number, title and prev/next.
 * Individual blog posts count as sheet B-02.
 */
export function PublicShell({ maxWidth, children }: { maxWidth: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const post = pathname.startsWith("/blog/");
  const idx = PUBLIC_SHEETS.findIndex((s) => (s.href === "/blog" ? pathname.startsWith("/blog") : pathname === s.href));
  const cur = idx >= 0 ? { ...PUBLIC_SHEETS[idx], ...(post ? { sheet: "B-02", page: "Article" } : {}) } : null;
  const prev = idx > 0 ? PUBLIC_SHEETS[idx - 1] : null;
  const next = idx >= 0 && idx < PUBLIC_SHEETS.length - 1 ? PUBLIC_SHEETS[idx + 1] : null;

  return (
    <>
      <div className="aorms-has-np" style={{ maxWidth, margin: "0 auto", padding: "0 1rem" }}>
        <header className="aorms-pub-header">
          <Link href="/" aria-label="AORMS home">
            {/* Plain <img>, not next/image — a fixed brand asset. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
          </Link>
          <nav aria-label="Site" className="aorms-pub-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={pathname === n.href || (n.href === "/blog" && post) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main style={{ paddingBottom: "4rem" }}>{children}</main>
      </div>
      {cur && (
        <aside className="aorms-np" aria-label="Sheet">
          <Link href="/" className="aorms-np__bar">
            AORMS →
          </Link>
          <p className="aorms-np__section">{cur.section}</p>
          <div className="aorms-np__num" data-long={cur.sheet.length > 2 ? "true" : undefined} aria-label={`Sheet ${cur.sheet}`}>
            {cur.sheet}
          </div>
          <p className="aorms-np__title">{cur.page}</p>
          <div className="aorms-np__arrows">
            {prev ? (
              <Link href={prev.href} aria-label={`Previous sheet: ${prev.page}`} title={prev.page}>
                ←
              </Link>
            ) : (
              <span aria-hidden>←</span>
            )}
            {next ? (
              <Link href={next.href} aria-label={`Next sheet: ${next.page}`} title={next.page}>
                →
              </Link>
            ) : (
              <span aria-hidden>→</span>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
