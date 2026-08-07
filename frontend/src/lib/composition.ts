/**
 * Shared composition rhythm — all surfaces (marketing, staff, portals, auth).
 *
 * Canon: docs/esti/COMPOSITION-PRINCIPLES.md
 * 60·30·10 colour · 8px modular grid · odd peer groups · von Restorff CTAs.
 *
 * MUI `spacing` multipliers (theme spacing = 8px). Prefer odd group counts
 * (3 / 5 / 7) when laying out peer cards, KPIs, and FAQ rows.
 */
export const COMPOSITION_RHYTHM = {
  /** Base unit in px */
  unitPx: 8,
  /** 8px — tight / hairline stacks */
  xs: 1,
  /** 16px — inline stacks, shell gutter (xs) */
  sm: 2,
  /** 24px — card pad, grid gap, shell gutter (md) */
  md: 3,
  /** 40px — block gap inside a section / page */
  lg: 5,
  /** 64px — section / stage air (mobile) */
  xl: 8,
  /** Stage page: header ↔ main gap */
  stageGap: 3, // 24px
  /** Soft header / card internal padding */
  cardPad: { xs: 2, md: 3 } as const, // 16 / 24
  /** Soft header padding on staff RailLayout */
  headerPad: { xs: 2, md: 3 } as const,
  /** Main column vertical rhythm inside stage */
  mainGap: 3, // 24px
  /** Portal / marketing content gutters */
  gutter: { xs: 2, md: 3 } as const,
  /** Portal stage vertical padding */
  portalStageY: { xs: 3, md: 5 } as const, // 24 / 40
  /** Portal stage bottom clear (clock + air) */
  portalStagePb: { xs: 10, md: 12 } as const,
  /** Auth card padding */
  authCardPad: 3, // 24px
  /** Auth card max width — single-column forms */
  authCardMaxPx: 440,
  /** Auth horizontal card — same content column as MarketingTopBar */
  authCardWideMaxPx: 1200,
  /** Locked split-card body height (md+) so Workspace · Portals · Account tabs don't resize */
  authCardHeightPx: 560,
  /** Section vertical padding (marketing / long-form) */
  sectionY: { xs: 8, md: 12 } as const, // 64 / 96
  /** Gap between card grids inside a section */
  blockGap: 5, // 40px
  /** Section head → content */
  headMb: 5, // 40px
  /** Sticky chrome inset from viewport edge */
  chromeInset: 1.5, // 12px — keep with 8px module via 8+4; prefer 2 (16) when redesigning
  chromeInsetMd: 2, // 16px
} as const;

/** Prefer these peer counts when grouping UI (odd). */
export const COMPOSITION_ODD_GROUPS = [1, 3, 5, 7] as const;

/**
 * Colour mass roles (60·30·10) — light product default.
 * Marketing locks this; staff dark/HC schemes remap roles, not the accent share.
 */
export const COMPOSITION_COLOUR = {
  fieldShare: 60, // Fog / Pure White canvas
  structureShare: 30, // coal ink + soft raised chrome
  accentShare: 10, // Radiant Orange — von Restorff CTAs only
} as const;
