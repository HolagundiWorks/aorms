import { Skeleton } from "@mui/material";

/**
 * Loading skeleton for tile/card grids. Pass to `DataState`'s `skeleton` prop.
 */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "0.25rem",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="esti-card-skeleton" variant="rounded" height={96} sx={{ width: "100%" }} />
      ))}
    </div>
  );
}
