import { Tile } from "@carbon/react";

/**
 * Shared KPI stat tile — the "4 KPI cards" pattern this repo's own module
 * map already calls out for dashboard-style screens (`StudioAbstract.tsx`
 * on the old frontend). Extracted from `dashboard/page.tsx`'s own local
 * `Kpi` function (2026-09-04) so a second screen (`/projects/[id]/decisions`)
 * doesn't grow a second, silently-drifting copy of the same ten lines.
 *
 * Number-first, label-below — matches the ERP typography guide's own KPI
 * pattern exactly (§20/21): number at `heading-05` (32px/40px) + the
 * `semibold` weight class (heading-05 is 400 by default in the real
 * Carbon v11 scale — see globals.scss's own header comment on the
 * `type.type-classes` fix this depended on), label below at `body-01`
 * (14px/400), not a `label-01` caption above it as this used to read.
 */
export function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Tile style={{ minHeight: "6.5rem" }}>
      <p className="cds--type-heading-05 cds--type-semibold">{value}</p>
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
        {label}
      </p>
    </Tile>
  );
}
