"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sheetFor } from "../../lib/shell/nav-data";

/**
 * Floating sheet footer (2026-09-30) — replaces the bordered drawing title
 * block that used to sit at the foot of every page. Same real fields, one
 * faint line fixed beside the AORMS mark at 50% opacity: office / section /
 * drawing / sheet / date. Office, section, drawing and sheet come from the
 * session and the nav position (lib/shell/nav-data.ts); the date is today in
 * IST, filled in after mount so a midnight server/client mismatch can't
 * break hydration. No revision/status fields — the app has no real data for
 * them. Non-interactive (pointer-events none), hidden in print.
 */
export function TitleBlock({ companyName }: { companyName: string }) {
  const sheet = sheetFor(usePathname());
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", "."));
  }, []);

  if (!sheet) return null;
  const parts = [sheet.section, sheet.page !== sheet.section ? sheet.page : null, `AORMS-${sheet.sheet}`, date].filter(Boolean);
  return (
    <p className="aorms-sheet-footer aorms-print-hide" aria-label="Sheet reference">
      {companyName && <span className="aorms-sheet-footer__office">{companyName} / </span>}
      {parts.join(" / ")}
    </p>
  );
}
