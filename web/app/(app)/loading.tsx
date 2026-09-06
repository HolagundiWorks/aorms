import { Column, Grid, SkeletonPlaceholder, SkeletonText } from "@carbon/react";

/**
 * Route-level loading UI (Next.js loading.tsx convention) for every page
 * under the authenticated app shell that doesn't define a more specific
 * loading.tsx of its own — shown while a Server Component page is fetching
 * its data, so navigating between pages shows a Carbon skeleton instead of
 * a blank content pane.
 */
export default function AppLoading() {
  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <div style={{ marginBottom: "1.5rem" }}>
          <SkeletonText heading width="40%" />
        </div>
        <SkeletonPlaceholder style={{ width: "100%", height: "12rem" }} />
      </Column>
    </Grid>
  );
}
