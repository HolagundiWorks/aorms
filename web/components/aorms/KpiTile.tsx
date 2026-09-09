import { Tile } from "@carbon/react";

/**
 * Shared KPI stat tile — the "4 KPI cards" pattern this repo's own module
 * map already calls out for dashboard-style screens (`StudioAbstract.tsx`
 * on the old frontend). Extracted from `dashboard/page.tsx`'s own local
 * `Kpi` function (2026-09-04) so a second screen (`/projects/[id]/decisions`)
 * doesn't grow a second, silently-drifting copy of the same ten lines.
 */
export function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Tile style={{ minHeight: "6rem" }}>
      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
        {label}
      </p>
      <p className="cds--type-heading-04" style={{ marginTop: "0.5rem" }}>
        {value}
      </p>
    </Tile>
  );
}
