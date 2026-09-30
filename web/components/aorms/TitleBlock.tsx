"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sheetFor } from "../../lib/shell/nav-data";

/**
 * Drawing title block (2026-09-30, HCWorks title-sheet direction) — the small
 * bordered block in the corner of every architectural sheet: office, sheet
 * number, drawing (page) name and date. Every field is real: the sheet comes
 * from the nav position (lib/shell/nav-data.ts), the drawing is the page's nav
 * label, the date is today in IST. No revision/status fields on purpose — the
 * app has no revision concept for a page, and a hard-coded "REV 01 / LIVE"
 * would be decoration pretending to be data.
 */
export function TitleBlock({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const sheet = sheetFor(pathname);
  // Client-only: the server can't know the viewer's "today" without risking a
  // hydration mismatch at midnight, so the date fills in after mount.
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", "."),
    );
  }, []);

  if (!sheet) return null;
  const rows: [string, string][] = [
    ["Office", companyName || "—"],
    ["System", "AORMS"],
    ["Section", sheet.section],
    ["Drawing", sheet.page],
    ["Sheet", `AORMS-${sheet.sheet}`],
    ["Date", date || "—"],
  ];
  return (
    <aside className="aorms-titleblock aorms-print-hide" aria-label="Sheet title block">
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
