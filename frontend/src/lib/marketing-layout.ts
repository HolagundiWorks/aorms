/**
 * Shared marketing chrome width — matches Landing content column.
 * Keep top bar and MarketingLandingDock on this column.
 *
 * Composition grammar: docs/esti/COMPOSITION-PRINCIPLES.md
 * (60·30·10 colour · 8px modular rhythm · odd grouping · von Restorff).
 */
export const MARKETING_CONTENT_MAX_PX = 1200;

/** Horizontal padding inside the content column (MUI spacing units = 8px). */
export const MARKETING_CONTENT_GUTTER = {
  xs: 2, // 16px
  md: 3, // 24px
} as const;

/**
 * 8px modular rhythm — prefer odd steps for peer groups (3, 5, 7).
 * MUI `spacing` multipliers (1 = 8px).
 */
export const MARKETING_RHYTHM = {
  /** Base unit in px */
  unitPx: 8,
  /** 8px — tight */
  xs: 1,
  /** 16px — inline */
  sm: 2,
  /** 24px — card pad / grid gap */
  md: 3,
  /** 40px — block gap inside a section */
  lg: 5,
  /** 64px — section air (mobile) */
  xl: 8,
  /** Section vertical padding */
  sectionY: { xs: 8, md: 12 } as const, // 64 / 96
  /** Gap between card grids inside a section */
  blockGap: 5, // 40px
  /** Card internal padding */
  cardPad: 3, // 24px
  /** Section head → content */
  headMb: 5, // 40px
} as const;

/** Sx for chrome that should span the content column (centered). */
export const marketingContentColumnSx = {
  width: "100%",
  maxWidth: MARKETING_CONTENT_MAX_PX,
  mx: "auto",
  boxSizing: "border-box" as const,
};
