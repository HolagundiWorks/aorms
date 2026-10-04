"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTALS, sheetFor } from "../../lib/shell/nav-data";

/**
 * Right-hand sheet nameplate for the Identity / ConnectDeX / SysDeX platforms and the
 * Client / Contractor / Collaborator portals (2026-10-04) — the Office Hub's `PortalNameplate`
 * generalised: portal name on the black bar, the sheet's big mono number, title, section,
 * previous/next sheet arrows within the portal, and (when known) the signed-in person.
 * Wide screens only (≥ 90rem, `.aorms-np` in globals.scss). Sign-in sheets (00…) get none.
 */
export function SheetNameplate({ who }: { who?: { name: string; role?: string } }) {
  const pathname = usePathname();
  const sheet = sheetFor(pathname);
  if (!sheet || !sheet.office || sheet.sheet.startsWith("00")) return null;

  const portal = Object.values(PORTALS).find((p) => sheet.sheet.startsWith(`${p.code}-`));
  if (!portal) return null;
  const items = portal.items;
  const idx = items.findIndex((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null;

  return (
    <aside className="aorms-np" aria-label="Sheet">
      <Link href={items[0].href} className="aorms-np__bar">
        {portal.name} →
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
      {who && (
        <div className="aorms-np__who">
          <strong>{who.name}</strong>
          {who.role && <span>{who.role}</span>}
        </div>
      )}
    </aside>
  );
}
