import Link from "next/link";
import { Tile } from "@carbon/react";

/**
 * Shared dashboard widget shell — extracted from
 * `app/(app)/dashboard/page.tsx` (2026-09-10 dashboard redesign) once
 * many more widgets needed the identical title-bar + empty-state + row
 * shape the original four already established. Behavior unchanged from
 * the inline version; just made reusable.
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
    <Tile>
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
