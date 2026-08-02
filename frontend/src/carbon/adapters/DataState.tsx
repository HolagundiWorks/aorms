import type { ReactNode } from "react";
import { SkeletonText, Stack, Tile } from "@carbon/react";

/**
 * Wave 2 adapter — kit `DataState` API → stock Carbon skeleton + empty tile.
 *
 * Drop-in for `@hcw/ui-kit`'s DataState. Loading renders a Carbon
 * `SkeletonText` (or a caller-supplied skeleton); empty renders the
 * title/description/action cluster inside a stock `Tile`; otherwise children.
 * Composition only — no custom components (§ 0, docs/esti/CARBON-MIGRATION.md).
 */
export function DataState({
  loading,
  isEmpty,
  empty,
  columnCount,
  skeleton,
  children,
}: {
  loading: boolean;
  isEmpty: boolean;
  empty: { title: string; description?: string; action?: ReactNode };
  columnCount?: number;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return <>{skeleton ?? <SkeletonText paragraph lineCount={columnCount ?? 3} />}</>;
  }
  if (isEmpty) {
    return (
      <Tile>
        <Stack gap={3}>
          <p className="cds--type-productive-heading-03">{empty.title}</p>
          {empty.description ? (
            <p className="cds--type-body-long-01">{empty.description}</p>
          ) : null}
          {empty.action ? <div>{empty.action}</div> : null}
        </Stack>
      </Tile>
    );
  }
  return <>{children}</>;
}

export default DataState;
