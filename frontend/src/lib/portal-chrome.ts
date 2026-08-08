/**
 * Firm-portal chrome tokens — heights, insets, clock, hit targets.
 * Every external portal screen inherits these via `PortalNeuFrame` CSS vars
 * (`--esti-portal-*` / `--esti-footer-height` / `--esti-dock-bottom`).
 *
 * Canon: docs/esti/PAGE-STRUCTURE.md · COMPOSITION-PRINCIPLES.md ·
 * docs/esti/FIRM-PORTAL-SECTIONS.md
 */
import type { CSSProperties } from "react";
import { COMPOSITION_RHYTHM } from "./composition.js";
import { MARKETING_CONTENT_MAX_PX } from "./marketing-layout.js";

const UNIT = COMPOSITION_RHYTHM.unitPx;

/** Ambient analogue clock diameter (px) — staff · portal · auth · marketing. */
export const AMBIENT_ANALOGUE_CLOCK_SIZE_PX = 100;

export const PORTAL_CHROME = {
  /** Content column — same as marketing / top bar */
  contentMaxPx: MARKETING_CONTENT_MAX_PX,
  /** Viewport edge inset for sticky top + floating footer (px) */
  chromeInsetPx: COMPOSITION_RHYTHM.chromeInsetMd * UNIT, // 16
  /** Soft top identity bar min-height */
  topBarMinHeightPx: 56,
  /** Floating taskbar height */
  footerHeightPx: 60,
  /** Footer + chrome inset — reserved for clock / dock clearance */
  footerStackPx: 60 + COMPOSITION_RHYTHM.chromeInsetMd * UNIT, // 76
  /** Extra air between ActionDock and footer stack */
  dockGapPx: 16,
  /** Calc / power / section chip hit target */
  footerHitPx: 35,
  /** Horizontal pad inside floating footer */
  footerPadXPx: 16,
  footerZIndex: 1100,
  topBarZIndex: 50,
  /** Ambient clock — see also `AMBIENT_ANALOGUE_CLOCK_SIZE_PX` */
  clockSizePx: AMBIENT_ANALOGUE_CLOCK_SIZE_PX,
  /** AORMS mark in dial centre as fraction of clock diameter */
  clockMarkRatio: 0.2,
  clockRightPx: { xs: 16, md: 24 } as const,
  clockZIndex: 40,
  /** Soft-square radius (kit RADIUS) */
  radiusPx: 8,
} as const;

/** CSS custom properties for `.esti-portal-neu` / `.esti-firm-portal-root`. */
export function portalChromeCssVars(hasFooter: boolean): CSSProperties {
  const inset = PORTAL_CHROME.chromeInsetPx;
  const stack = PORTAL_CHROME.footerStackPx;
  const dockGap = PORTAL_CHROME.dockGapPx;
  return {
    ["--esti-portal-footer-height" as string]: `${PORTAL_CHROME.footerHeightPx}px`,
    ["--esti-portal-chrome-inset" as string]: `${inset}px`,
    ["--esti-portal-hit" as string]: `${PORTAL_CHROME.footerHitPx}px`,
    ["--esti-portal-footer-pad-x" as string]: `${PORTAL_CHROME.footerPadXPx}px`,
    ["--esti-analogue-clock-size" as string]: `${PORTAL_CHROME.clockSizePx}px`,
    ["--esti-footer-height" as string]: hasFooter ? `${stack}px` : "0px",
    ["--esti-dock-bottom" as string]: hasFooter
      ? `calc(var(--esti-footer-height) + ${dockGap}px)`
      : `${inset + 8}px`,
  };
}
