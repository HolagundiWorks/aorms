import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import { Surface, RADIUS, chromeIconSx, colors } from "@hcw/ui-kit";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { matchShellKey, tooltipWithChord } from "../../lib/keymap.js";
import {
  MARKETING_CONTENT_GUTTER,
  marketingContentColumnSx,
} from "../../lib/marketing-layout.js";

export type MarketingDockSection = {
  href: string;
  label: string;
};

function sectionIdFromHref(href: string): string | null {
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : "";
  return hash || null;
}

/**
 * Landing bottom chrome: section text links (left) + action buttons (right 60%).
 * Active section uses primary highlight colour — not chip buttons.
 */
export function MarketingLandingDock({
  sections,
  signInHref = "/",
  signInLabel = "Home",
}: {
  sections: readonly MarketingDockSection[];
  signInHref?: string;
  signInLabel?: string;
}) {
  const { pathname, hash } = useLocation();
  const [spyId, setSpyId] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      matchShellKey(e, { calculator: () => setShowCalc((o) => !o) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const ids = sections.map((s) => sectionIdFromHref(s.href)).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }
        if (visible.size === 0) return;
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setSpyId(bestId);
      },
      { root: null, rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] },
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [sections, pathname]);

  const hashId = hash.replace(/^#/, "");
  const activeId =
    (hashId && sections.some((s) => sectionIdFromHref(s.href) === hashId) ? hashId : null) ??
    spyId ??
    sectionIdFromHref(sections[0]?.href ?? "") ??
    null;

  const btnSx = {
    textTransform: "none" as const,
    fontWeight: 700,
    borderRadius: `${RADIUS}px`,
    minHeight: 40,
    height: 40,
    px: 1.5,
  };

  return (
    <>
      <Box
        className="esti-mkt-landing-dock-wrap"
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 24,
          zIndex: 1240,
          px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
          pointerEvents: "none",
        }}
      >
        <Surface
          layer="soft"
          component="nav"
          className="esti-mkt-landing-dock"
          aria-label="Page sections and actions"
          sx={{
            ...marketingContentColumnSx,
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: { xs: 1.25, md: 2 },
            py: 0,
            minHeight: 56,
            height: 56,
            borderRadius: `${RADIUS}px`,
          }}
        >
          {/* Sections — simple text, active = primary */}
          {sections.length > 0 ? (
            <Stack
              direction="row"
              spacing={{ xs: 1, md: 2 }}
              component="div"
              sx={{
                flex: "1 1 40%",
                minWidth: 0,
                alignItems: "center",
                overflowX: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {sections.map((s) => {
                const id = sectionIdFromHref(s.href);
                const active = id != null && id === activeId;
                return (
                  <Typography
                    key={s.href}
                    component="a"
                    href={s.href}
                    variant="body2"
                    sx={{
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      fontWeight: active ? 700 : 500,
                      color: active ? "primary.main" : "text.secondary",
                      borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
                      pb: 0.25,
                      transition: "color 120ms ease",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {s.label}
                  </Typography>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ flex: "1 1 40%", minWidth: 0 }} />
          )}

          {/* Actions — buttons cover ~60% */}
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              flex: "0 0 60%",
              maxWidth: "60%",
              minWidth: 0,
              justifyContent: "flex-end",
              alignItems: "center",
              flexWrap: "nowrap",
            }}
          >
            <Tooltip title={tooltipWithChord("Calculator", "calculator")}>
              <IconButton
                ref={calcTriggerRef}
                color={showCalc ? "primary" : "default"}
                onClick={() => setShowCalc((o) => !o)}
                aria-label="Calculator"
                aria-pressed={showCalc}
                size="small"
                sx={{ ...chromeIconSx, borderRadius: `${RADIUS}px`, minWidth: 40, minHeight: 40 }}
              >
                <CalculateOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button component={RouterLink} to="/blog" variant="outlined" size="small" sx={btnSx}>
              Blog
            </Button>
            <Button component={RouterLink} to="/downloads" variant="outlined" size="small" sx={btnSx}>
              Downloads
            </Button>
            <Button component={RouterLink} to={signInHref} variant="contained" size="small" sx={btnSx}>
              {signInLabel}
            </Button>
          </Stack>
        </Surface>
      </Box>
      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
        placement="above"
      />
    </>
  );
}
