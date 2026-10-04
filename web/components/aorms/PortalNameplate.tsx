"use client";

import { usePathname } from "next/navigation";
import { sheetFor } from "../../lib/shell/nav-data";
import { PlanGlyph } from "./PlanGlyph";

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
