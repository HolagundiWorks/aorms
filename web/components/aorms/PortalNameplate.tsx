"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, NAV_TOP, sheetFor } from "../../lib/shell/nav-data";
import { PlanGlyph } from "./PlanGlyph";

/** Flat, ordered list of every Hub sheet — the same order as the side nav and the sheet numbers. */
const SHEETS: { href: string; label: string }[] = [...NAV_TOP, ...NAV_GROUPS.flatMap((g) => g.items)];

/**
 * Right-hand nameplate for the Office Hub (2026-10-02) — the landing page's hcworks.in-style
 * nameplate brought into the portal: the studio on a black bar, the sheet's big mono number,
 * its title and section, previous/next sheet arrows, and the signed-in person. Shown on wide
 * screens only (≥ 90rem, see `.aorms-np` in globals.scss); the header already carries the same
 * identity on narrower ones. Purely navigational — no data of its own.
 */
export function PortalNameplate({ companyName, userName, userRole }: { companyName: string; userName: string; userRole: string }) {
  const pathname = usePathname();
  const sheet = sheetFor(pathname);
  if (!sheet || sheet.office) return null; // only Hub sheets (portals/sign-in have their own shells)

  const idx = SHEETS.findIndex((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  const prev = idx > 0 ? SHEETS[idx - 1] : null;
  const next = idx >= 0 && idx < SHEETS.length - 1 ? SHEETS[idx + 1] : null;

  return (
    <aside className="aorms-np" aria-label="Sheet">
      <Link href="/pulse" className="aorms-np__bar">
        {companyName || "AORMS"} →
      </Link>
      <p className="aorms-np__section">{sheet.section}</p>
      <div className="aorms-np__num" data-long={sheet.sheet.length > 2 ? "true" : undefined} aria-label={`Sheet ${sheet.sheet}`}>
        {sheet.sheet}
      </div>
      <p className="aorms-np__title">{sheet.page}</p>
      <div className="aorms-np__arrows">
        {prev ? (
          <Link href={prev.href} aria-label={`Previous sheet: ${prev.label}`} title={prev.label}>
            ←
          </Link>
        ) : (
          <span aria-hidden>←</span>
        )}
        {next ? (
          <Link href={next.href} aria-label={`Next sheet: ${next.label}`} title={next.label}>
            →
          </Link>
        ) : (
          <span aria-hidden>→</span>
        )}
      </div>
      <div className="aorms-np__who">
        <strong>{userName}</strong>
        <span>{userRole}</span>
      </div>
    </aside>
  );
}

/**
 * The "visual aid" — a generated plan drawing pinned bottom-right behind the page, as on the
 * landing page (hcworks.in's corner figure). Decorative only: aria-hidden, faint, non-interactive,
 * below the content (see `.aorms-corner`). The drawing is a function of the sheet number, so each
 * sheet gets its own plan, stable between visits.
 */
export function CornerFigure() {
  const sheet = sheetFor(usePathname());
  if (!sheet) return null;
  const h = [...sheet.sheet].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  return (
    <div className="aorms-corner" aria-hidden>
      <PlanGlyph seed={sheet.sheet} builtUpSqm={220 + (h % 600)} siteSqm={400 + (h % 900)} floors={1 + (h % 3)} height={200} />
    </div>
  );
}
