import { Box, Button, Stack, Typography } from "@mui/material";
import { AnalogueClock, Surface, colors, RADIUS } from "@hcw/ui-kit";
import { Link as RouterLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AormsLogo } from "../AormsLogo.js";
import { MARKETING_RAIL_PAGES, railPageLinkIsActive } from "../../lib/marketing-page-nav.js";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";

/** Soft-neu top ribbon for public marketing surfaces (replaces left glass rail). */
export function MarketingTopBar({
  ctaHref = "/login",
  ctaLabel = "Sign in",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const { pathname, hash } = useLocation();

  return (
    <Surface
      layer="soft"
      component="header"
      className="esti-mkt-topbar"
      sx={{
        position: "sticky",
        top: 12,
        zIndex: 50,
        mx: { xs: 1.5, md: 2 },
        mt: 1.5,
        px: { xs: 1.5, md: 2.5 },
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        borderRadius: `${RADIUS}px`,
      }}
    >
      <RouterLink to="/" aria-label={`${AORMS_PLATFORM.name} home`} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        <AormsLogo variant="rail" />
      </RouterLink>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: "none", sm: "block" }, letterSpacing: "0.04em", maxWidth: 220 }}
      >
        {AORMS_PLATFORM.expansion}
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        component="nav"
        aria-label="Marketing"
        sx={{ ml: { md: "auto" }, flexWrap: "wrap", alignItems: "center" }}
      >
        {MARKETING_RAIL_PAGES.map((link) => {
          const active = railPageLinkIsActive(link.href, pathname, hash);
          return (
            <Button
              key={link.href}
              component={RouterLink}
              to={link.href}
              size="small"
              variant="text"
              sx={{
                textTransform: "none",
                fontWeight: active ? 700 : 600,
                color: active ? "primary.main" : "text.secondary",
                borderRadius: `${RADIUS}px`,
                minHeight: 40,
                px: 1.25,
              }}
            >
              {link.label}
            </Button>
          );
        })}
        <Button
          component={RouterLink}
          to={ctaHref}
          variant="contained"
          size="small"
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px`, minHeight: 40, ml: 0.5 }}
        >
          {ctaLabel}
        </Button>
      </Stack>
    </Surface>
  );
}

/** Fixed bottom-right analogue clock for marketing (separate from any digital tray). */
export function MarketingAnalogueClock() {
  return (
    <AnalogueClock
      size={104}
      className="esti-mkt-analogue-clock"
      sx={{
        position: "fixed",
        right: 20,
        bottom: 88,
        zIndex: 45,
        pointerEvents: "none",
      }}
    />
  );
}

/** Full-page neu marketing frame: top bar · stage · clock. */
export function MarketingNeuFrame({
  children,
  mainId = "lp-main",
  ctaHref,
  ctaLabel,
}: {
  children: ReactNode;
  mainId?: string;
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
      <MarketingTopBar ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <Box
        component="main"
        id={mainId}
        tabIndex={-1}
        sx={{ flex: 1, minWidth: 0, width: "100%" }}
      >
        {children}
      </Box>
      <MarketingAnalogueClock />
    </Box>
  );
}
