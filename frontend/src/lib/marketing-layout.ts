/**
 * Shared marketing chrome width — matches Landing `Container maxWidth="lg"`.
 * Keep top bar and MarketingLandingDock on this column.
 */
export const MARKETING_CONTENT_MAX_PX = 1200;

/** Horizontal padding inside the content column (MUI spacing units). */
export const MARKETING_CONTENT_GUTTER = {
  xs: 2, // 16px
  md: 3, // 24px
} as const;

/** Sx for chrome that should span the content column (centered). */
export const marketingContentColumnSx = {
  width: "100%",
  maxWidth: MARKETING_CONTENT_MAX_PX,
  mx: "auto",
  boxSizing: "border-box" as const,
};
