import { AnalogueClock, Surface, colors, RADIUS } from "@hcw/ui-kit";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import {
  MARKETING_CONTENT_GUTTER,
  MARKETING_CONTENT_MAX_PX,
  marketingContentColumnSx,
} from "../../lib/marketing-layout.js";

/**
 * Shared no-rail portal chrome — soft top bar · full-width stage · analogue clock.
 * Same spatial model as marketing (`MarketingNeuFrame`) and staff apps.
 * No ActionDock / taskbar (portal exception). No Pomodoro (provider is staff-only).
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
          top: 12,
          zIndex: 50,
          width: "100%",
          px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
          mt: 1.5,
          boxSizing: "border-box",
        }}
      >
        <Surface
          layer="soft"
          component="header"
          className="esti-portal-neu__topbar"
          sx={{
            ...marketingContentColumnSx,
            px: { xs: 1.5, md: 2.5 },
            py: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
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
          px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
          py: { xs: 2, md: 3 },
          pb: { xs: 10, md: 12 },
          boxSizing: "border-box",
        }}
      >
        {children}
      </Box>

      <Box
        className="esti-portal-neu__clock"
        sx={{
          position: "fixed",
          right: { xs: 12, md: 20 },
          bottom: { xs: 12, md: 20 },
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
