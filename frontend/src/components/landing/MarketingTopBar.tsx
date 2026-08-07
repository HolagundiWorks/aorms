import { Box, Typography } from "@mui/material";
import { Surface, colors, RADIUS } from "@hcw/ui-kit";
import { Link as RouterLink } from "react-router-dom";
import { type ReactNode } from "react";
import { AormsLogo } from "../AormsLogo.js";
import { MarketingClockPomodoro } from "./MarketingClockPomodoro.js";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import {
  MARKETING_CONTENT_GUTTER,
  marketingContentColumnSx,
} from "../../lib/marketing-layout.js";

/**
 * Brand-only marketing top ribbon — logo + expansion.
 * Page actions (Blog, Downloads, Sign in, Calculator) live in MarketingLandingDock.
 */
export function MarketingTopBar() {
  return (
    <Box
      className="esti-mkt-topbar-wrap"
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
        className="esti-mkt-topbar"
        sx={{
          ...marketingContentColumnSx,
          px: { xs: 1.5, md: 2.5 },
          py: 0,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "nowrap",
          borderRadius: `${RADIUS}px`,
          minHeight: 56,
          height: 56,
        }}
      >
        <RouterLink
          to="/"
          aria-label={`${AORMS_PLATFORM.name} home`}
          style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
        >
          <AormsLogo variant="rail" />
        </RouterLink>
        <Typography
          variant="caption"
          color="text.secondary"
          className="esti-label esti-label--secondary"
          sx={{ display: { xs: "none", sm: "block" }, letterSpacing: "0.04em", maxWidth: 280 }}
        >
          {AORMS_PLATFORM.expansion}
        </Typography>
      </Surface>
    </Box>
  );
}

/** Full-page neu marketing frame: brand header · stage · clock+focus. */
export function MarketingNeuFrame({
  children,
  mainId = "lp-main",
}: {
  children: ReactNode;
  mainId?: string;
  /** @deprecated Actions moved to MarketingLandingDock — kept for call-site compat. */
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Box
      className="esti-lp-neu"
      sx={{
        minHeight: "100vh",
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <a href={`#${mainId}`} className="esti-skip-link">
        Skip to content
      </a>
      <MarketingTopBar />
      <Box component="main" id={mainId} tabIndex={-1} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        {children}
      </Box>
      <MarketingClockPomodoro />
    </Box>
  );
}
