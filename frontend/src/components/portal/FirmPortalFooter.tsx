import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import { Box, Button, IconButton, Stack, Tooltip } from "@mui/material";
import { Surface, chromeIconSx } from "@hcw/ui-kit";
import { useEffect, useRef, useState } from "react";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { matchShellKey, tooltipWithChord } from "../../lib/keymap.js";
import { PORTAL_CHROME } from "../../lib/portal-chrome.js";
import {
  FIRM_PORTAL_SECTIONS,
  type FirmPortalSection,
} from "./FirmPortalSections.js";

const R8 = "8px";
const HIT = PORTAL_CHROME.footerHitPx;

/** Footer icon chips — `PORTAL_CHROME.footerHitPx`. */
const portalChromeIconSx = {
  ...chromeIconSx,
  width: HIT,
  height: HIT,
  '[data-hcw-coga="calm"] &': {
    width: HIT,
    height: HIT,
  },
} as const;

/**
 * Floating firm-portal taskbar (`PORTAL_CHROME.footerHeightPx`):
 *   LEFT   — calculator
 *   CENTER — section text launchers (Updates · Project · Progress · Drawings · Documents)
 *   RIGHT  — power sign-out
 * Width matches top bar via `PortalNeuFrame` content column.
 */
export function FirmPortalFooter({
  sections,
  section,
  onSectionChange,
  onSignOut,
  signingOut,
}: {
  sections: FirmPortalSection[];
  section: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
  onSignOut?: () => void;
  signingOut?: boolean;
}) {
  const [showCalc, setShowCalc] = useState(false);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);
  const tabDefs = FIRM_PORTAL_SECTIONS.filter((s) => sections.includes(s.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      matchShellKey(e, { calculator: () => setShowCalc((o) => !o) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Surface
      component="footer"
      layer="soft"
      // Keep `hcw-surface` — kit Surface puts className last; without it,
      // numeric RADIUS × theme.shape.borderRadius → 64px corners.
      className="hcw-surface esti-portal-neu__footerbar esti-portal-footer"
      aria-label="Portal taskbar"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        width: "100%",
        height: PORTAL_CHROME.footerHeightPx,
        minHeight: PORTAL_CHROME.footerHeightPx,
        px: `${PORTAL_CHROME.footerPadXPx}px`,
        boxSizing: "border-box",
        borderRadius: R8,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
        }}
      >
        <Tooltip title={tooltipWithChord("Calculator", "calculator")}>
          <IconButton
            ref={calcTriggerRef}
            color={showCalc ? "primary" : "default"}
            onClick={() => setShowCalc((o) => !o)}
            aria-label="Calculator"
            sx={portalChromeIconSx}
          >
            <CalculateOutlined />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack
        direction="row"
        spacing={0.5}
        className="esti-app-footer__launcher-anchor"
        sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
        role="navigation"
        aria-label="Portal sections"
      >
        {tabDefs.map((s) => {
          const active = section === s.id;
          return (
            <Button
              key={s.id}
              size="small"
              variant={active ? "contained" : "text"}
              color={active ? "primary" : "inherit"}
              onClick={() => onSectionChange?.(s.id)}
              aria-current={active ? "page" : undefined}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: `${R8} !important`,
                minHeight: HIT,
                px: 1.5,
              }}
            >
              {s.label}
            </Button>
          );
        })}
      </Stack>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 0 }}
      >
        {onSignOut ? (
          <Tooltip title="Sign out">
            <span>
              <IconButton
                onClick={() => {
                  if (!signingOut) onSignOut();
                }}
                disabled={signingOut}
                aria-label="Sign out"
                sx={portalChromeIconSx}
              >
                <PowerSettingsNew />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
    </Surface>
  );
}
