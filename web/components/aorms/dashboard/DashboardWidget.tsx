import Link from "next/link";
import { Tile } from "@carbon/react";

/**
 * Shared dashboard widget shell — extracted from
 * `app/(app)/dashboard/page.tsx` (2026-09-10 dashboard redesign) once
 * many more widgets needed the identical title-bar + empty-state + row
 * shape the original four already established. Behavior unchanged from
 * the inline version; just made reusable.
 *
 * `breakInside: "avoid"` + `marginBottom` (2026-09-14, horizontal-masonry
 * request) make each widget a valid masonry item: paired with
 * `MASONRY_PANEL_STYLE` on the parent container, tiles pack into
 * same-width columns without every tile in a row being stretched to
 * match its tallest neighbor (the "standard" grid's actual complaint —
 * `display:grid`'s row tracks all share one height). CSS multi-column
 * has no `row-gap` equivalent for stacked items, so the vertical gap
 * lives here instead of the container's `gap`.
 */
export function DashboardWidget({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Tile style={{ breakInside: "avoid", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h2 className="cds--type-heading-02">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="cds--type-body-01">
            View all
          </Link>
        )}
      </div>
      {children}
    </Tile>
  );
}

/**
 * Horizontal-masonry container (2026-09-14 UI-polish request, replacing
 * the panels' old `display:grid, gridTemplateColumns: repeat(auto-fit,
 * minmax(20rem,1fr))`) — CSS multi-column layout: the browser picks a
 * column count from the available width and each column's own width
 * (~20rem, same as the old `minmax` floor), then flows widgets into
 * whichever column is shortest next, instead of Grid's strict row
 * matrix (every tile in a row forced to the row's tallest tile's
 * height). `columnGap` is the horizontal gap between columns; the
 * vertical gap between stacked tiles in the same column comes from each
 * `DashboardWidget`'s own `marginBottom` above (multi-column has no
 * `row-gap`).
 */
export const MASONRY_PANEL_STYLE: React.CSSProperties = {
  columnWidth: "20rem",
  columnGap: "1rem",
};

export function EmptyRow({ text }: { text: string }) {
  return (
    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
      {text}
    </p>
  );
}

export function WidgetRow({
  href,
  primary,
  secondary,
  right,
}: {
  href?: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const row = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid var(--cds-border-subtle)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p className="cds--type-body-01" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {primary}
        </p>
        {secondary && (
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            {secondary}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0, textAlign: "right" }}>{right}</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
      {row}
    </Link>
  ) : (
    row
  );
}
