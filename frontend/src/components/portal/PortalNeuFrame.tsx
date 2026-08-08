import { AnalogueClock, Surface, colors, RADIUS } from "@hcw/ui-kit";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import {
  MARKETING_CONTENT_MAX_PX,
  marketingContentColumnSx,
} from "../../lib/marketing-layout.js";

/**
 * Shared no-rail portal chrome — soft top bar · full-width stage · analogue clock.
 * Same spatial model as marketing (`MarketingNeuFrame`) and staff apps.
 * Spacing: COMPOSITION_RHYTHM. Canon: docs/esti/COMPOSITION-PRINCIPLES.md
 */
export function PortalNeuFrame({
  topBar,
  children,
  mainId = "esti-main",
}: {
  topBar: ReactNode;
  children: ReactNode;
  mainId?: string;
}) {
  return (
    <Box
      className="esti-portal-neu"
      sx={{
        minHeight: "100dvh",
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <a href={`#${mainId}`} className="esti-skip-link">
        Skip to main content
      </a>

      <Box
        className="esti-portal-neu__top-wrap"
        sx={{
          position: "sticky",
          top: COMPOSITION_RHYTHM.chromeInsetMd * 8,
          zIndex: 50,
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
            minHeight: 56,
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
          maxWidth: MARKETING_CONTENT_MAX_PX,
          mx: "auto",
          px: { xs: COMPOSITION_RHYTHM.gutter.xs, md: COMPOSITION_RHYTHM.gutter.md },
          py: COMPOSITION_RHYTHM.portalStageY,
          pb: COMPOSITION_RHYTHM.portalStagePb,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: COMPOSITION_RHYTHM.mainGap,
        }}
      >
        {children}
      </Box>

      <Box
        className="esti-portal-neu__clock"
        sx={{
          position: "fixed",
          right: { xs: 16, md: 24 },
          bottom: { xs: 16, md: 24 },
          zIndex: 40,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <AnalogueClock size={72} />
      </Box>
    </Box>
  );
}
