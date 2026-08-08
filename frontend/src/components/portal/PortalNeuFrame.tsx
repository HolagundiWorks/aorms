import { Surface, colors, RADIUS } from "@hcw/ui-kit";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AormsAnalogueClock } from "../AormsAnalogueClock.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { marketingContentColumnSx } from "../../lib/marketing-layout.js";
import { PORTAL_CHROME, portalChromeCssVars } from "../../lib/portal-chrome.js";

/**
 * Shared no-rail portal chrome — soft top bar · 1200px stage · floating
 * FirmPortalFooter · AormsAnalogueClock. Tokens: `lib/portal-chrome.ts`.
 * Canon: docs/esti/PAGE-STRUCTURE.md · COMPOSITION-PRINCIPLES.md
 */
export function PortalNeuFrame({
  topBar,
  footer,
  children,
  mainId = "esti-main",
}: {
  topBar: ReactNode;
  /** Floating soft-neu taskbar (calc · nav · tray). When set, clock clears the footer. */
  footer?: ReactNode;
  children: ReactNode;
  mainId?: string;
}) {
  const hasFooter = Boolean(footer);
  const insetPx = PORTAL_CHROME.chromeInsetPx;

  return (
    <Box
      className="esti-portal-neu"
      sx={{
        minHeight: "100dvh",
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        ...portalChromeCssVars(hasFooter),
      }}
    >
      <a href={`#${mainId}`} className="esti-skip-link">
        Skip to main content
      </a>

      <Box
        className="esti-portal-neu__top-wrap"
        sx={{
          position: "sticky",
          top: insetPx,
          zIndex: PORTAL_CHROME.topBarZIndex,
          width: "100%",
          px: { xs: COMPOSITION_RHYTHM.gutter.xs, md: COMPOSITION_RHYTHM.gutter.md },
          mt: COMPOSITION_RHYTHM.sm,
          boxSizing: "border-box",
        }}
      >
        <Surface
          layer="soft"
          component="header"
          // Keep `hcw-surface` — kit Surface puts className last; without it,
          // numeric RADIUS (8) × theme.shape.borderRadius (8) → 64px corners.
          className="hcw-surface esti-portal-neu__topbar"
          sx={{
            ...marketingContentColumnSx,
            px: COMPOSITION_RHYTHM.headerPad,
            py: COMPOSITION_RHYTHM.sm,
            display: "flex",
            flexDirection: "column",
            gap: COMPOSITION_RHYTHM.sm,
            borderRadius: `${RADIUS}px`,
            minHeight: PORTAL_CHROME.topBarMinHeightPx,
          }}
        >
          {topBar}
        </Surface>
      </Box>

      <Box
        component="main"
        id={mainId}
        tabIndex={-1}
        className="esti-portal-neu__stage"
        sx={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          maxWidth: PORTAL_CHROME.contentMaxPx,
          mx: "auto",
          px: { xs: COMPOSITION_RHYTHM.gutter.xs, md: COMPOSITION_RHYTHM.gutter.md },
          py: COMPOSITION_RHYTHM.portalStageY,
          pb: hasFooter
            ? { xs: 12, md: 14 }
            : COMPOSITION_RHYTHM.portalStagePb,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: COMPOSITION_RHYTHM.mainGap,
        }}
      >
        {children}
      </Box>

      {footer ? (
        <Box
          className="esti-portal-neu__footer-wrap"
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: insetPx,
            zIndex: PORTAL_CHROME.footerZIndex,
            width: "100%",
            px: { xs: COMPOSITION_RHYTHM.gutter.xs, md: COMPOSITION_RHYTHM.gutter.md },
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              ...marketingContentColumnSx,
              pointerEvents: "auto",
            }}
          >
            {footer}
          </Box>
        </Box>
      ) : null}

      <Box
        className="esti-portal-neu__clock"
        sx={{
          position: "fixed",
          right: {
            xs: PORTAL_CHROME.clockRightPx.xs,
            md: PORTAL_CHROME.clockRightPx.md,
          },
          bottom: hasFooter
            ? `calc(var(--esti-footer-height) + ${PORTAL_CHROME.dockGapPx}px)`
            : {
                xs: PORTAL_CHROME.clockRightPx.xs,
                md: PORTAL_CHROME.clockRightPx.md,
              },
          zIndex: PORTAL_CHROME.clockZIndex,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <AormsAnalogueClock size={PORTAL_CHROME.clockSizePx} />
      </Box>
    </Box>
  );
}
