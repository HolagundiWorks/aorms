import { SkeletonPlaceholder } from "@carbon/react";
import { CarbonScope } from "../carbon/CarbonScope.js";

/**
 * Loading skeleton for tile/card grids. Pass to `DataState`'s `skeleton` prop.
 * Wave 3 (Carbon): stock `SkeletonPlaceholder` in a CSS grid; was MUI
 * `Grid` + `Skeleton`.
 */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <CarbonScope>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.25rem",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonPlaceholder
            key={i}
            className="esti-card-skeleton"
            style={{ width: "100%", height: 96 }}
          />
        ))}
      </div>
    </CarbonScope>
  );
}
