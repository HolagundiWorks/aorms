import { Box, Typography } from "@mui/material";
import { Surface, colors, RADIUS } from "@hcw/ui-kit";
import { useEffect, useState, type ReactNode } from "react";
import { AormsLogo } from "../AormsLogo.js";
import { MarketingClockPomodoro } from "./MarketingClockPomodoro.js";
import { MarketingHomeLink } from "./MarketingHomeLink.js";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import {
  MARKETING_CONTENT_GUTTER,
  marketingContentColumnSx,
} from "../../lib/marketing-layout.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

export { MarketingHomeLink } from "./MarketingHomeLink.js";

/**
 * Brand-only marketing top ribbon — logo + expansion.
 * Page actions (Blog, Downloads, Home, Calculator) live in MarketingLandingDock.
 *
 * `revealMode`: fixed chrome that stays concealed until the parent shows it
 * (landing hero — black full-bleed first; bar after scroll past hero).
 */
export function MarketingTopBar({
  revealMode = false,
  visible = true,
}: {
  revealMode?: boolean;
  visible?: boolean;
}) {
  const wrapClass = [
    "esti-mkt-topbar-wrap",
    revealMode ? "esti-mkt-topbar-wrap--reveal" : "",
    revealMode && visible ? "esti-mkt-topbar-wrap--shown" : "",
    revealMode && !visible ? "esti-mkt-topbar-wrap--concealed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      className={wrapClass}
      aria-hidden={revealMode && !visible ? true : undefined}
      sx={{
        position: revealMode ? "fixed" : "sticky",
        top: COMPOSITION_RHYTHM.chromeInsetMd * 8,
        left: 0,
        right: 0,
        zIndex: 50,
        width: "100%",
        px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
        mt: revealMode ? 0 : COMPOSITION_RHYTHM.sm,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <Surface
        layer="soft"
        component="header"
        className="esti-mkt-topbar"
        sx={{
          ...marketingContentColumnSx,
          px: COMPOSITION_RHYTHM.headerPad,
          py: 0,
          display: "flex",
          alignItems: "center",
          gap: COMPOSITION_RHYTHM.md,
          flexWrap: "nowrap",
          borderRadius: `${RADIUS}px`,
          minHeight: 56,
          height: 56,
        }}
      >
        <MarketingHomeLink
          style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
        >
          <AormsLogo variant="rail" />
        </MarketingHomeLink>
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
  /** When set, header stays hidden while `#id` (hero) intersects; shows after scroll past. */
  revealHeaderAfterId,
  /** Landing: no soft top ribbon — hero owns the brand. */
  hideTopBar = false,
}: {
  children: ReactNode;
  mainId?: string;
  /** @deprecated Actions moved to MarketingLandingDock — kept for call-site compat. */
  ctaHref?: string;
  ctaLabel?: string;
  revealHeaderAfterId?: string;
  hideTopBar?: boolean;
}) {
  const revealMode = Boolean(revealHeaderAfterId) && !hideTopBar;
  const [headerVisible, setHeaderVisible] = useState(!revealMode);

  useEffect(() => {
    if (!revealHeaderAfterId || hideTopBar) return;
    const el = document.getElementById(revealHeaderAfterId);
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Show soft header once the hero has scrolled off (bottom above inset).
      setHeaderVisible(rect.bottom <= 12);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [revealHeaderAfterId, hideTopBar]);

  const frameClass = [
    "esti-lp-neu",
    revealMode ? "esti-lp-neu--reveal-header" : "",
    hideTopBar ? "esti-lp-neu--no-topbar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      className={frameClass}
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
      {!hideTopBar ? (
        <MarketingTopBar revealMode={revealMode} visible={headerVisible} />
      ) : null}
      <Box component="main" id={mainId} tabIndex={-1} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        {children}
      </Box>
      <MarketingClockPomodoro />
    </Box>
  );
}
