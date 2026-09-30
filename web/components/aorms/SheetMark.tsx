"use client";

import { usePathname } from "next/navigation";
import { sheetFor } from "../../lib/shell/nav-data";

/** `AORMS-04.03 · SITE · PROGRESS REPORTS` — the sheet reference above a page title. Renders nothing off the nav. */
export function SheetMark() {
  const sheet = sheetFor(usePathname());
  if (!sheet) return null;
  return (
    <p className="aorms-sheet-mark">
      <span>AORMS-{sheet.sheet}</span>
      <span aria-hidden> / </span>
      <span>{sheet.section}</span>
      {sheet.page !== sheet.section && (
        <>
          <span aria-hidden> / </span>
          <span>{sheet.page}</span>
        </>
      )}
    </p>
  );
}
