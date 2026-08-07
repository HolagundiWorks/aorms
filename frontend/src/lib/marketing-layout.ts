/**
 * Shared marketing chrome width — matches Landing content column.
 * Keep top bar and MarketingLandingDock on this column.
 *
 * Composition grammar: docs/esti/COMPOSITION-PRINCIPLES.md
 * Rhythm tokens live in `./composition.js` (shared with staff + portals).
 */
import { COMPOSITION_RHYTHM } from "./composition.js";

export const MARKETING_CONTENT_MAX_PX = 1200;

/** Horizontal padding inside the content column (MUI spacing units = 8px). */
export const MARKETING_CONTENT_GUTTER = COMPOSITION_RHYTHM.gutter;

/**
 * @deprecated Prefer `COMPOSITION_RHYTHM` from `./composition.js`.
 * Alias kept so landing call-sites stay stable.
 */
export const MARKETING_RHYTHM = {
  unitPx: COMPOSITION_RHYTHM.unitPx,
  xs: COMPOSITION_RHYTHM.xs,
  sm: COMPOSITION_RHYTHM.sm,
  md: COMPOSITION_RHYTHM.md,
  lg: COMPOSITION_RHYTHM.lg,
  xl: COMPOSITION_RHYTHM.xl,
  sectionY: COMPOSITION_RHYTHM.sectionY,
  blockGap: COMPOSITION_RHYTHM.blockGap,
  cardPad: COMPOSITION_RHYTHM.md,
  headMb: COMPOSITION_RHYTHM.headMb,
} as const;

/** Sx for chrome that should span the content column (centered). */
export const marketingContentColumnSx = {
  width: "100%",
  maxWidth: MARKETING_CONTENT_MAX_PX,
  mx: "auto",
  boxSizing: "border-box" as const,
};

export { COMPOSITION_RHYTHM, COMPOSITION_ODD_GROUPS, COMPOSITION_COLOUR } from "./composition.js";
