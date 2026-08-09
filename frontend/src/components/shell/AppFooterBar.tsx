import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import SelfImprovement from "@mui/icons-material/SelfImprovement";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import { Surface, chromeIconSx } from "@hcw/ui-kit";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { WellnessPanel } from "../wellness/WellnessPanel.js";
import { WellnessReminderBanner } from "../wellness/WellnessReminderBanner.js";
import { useWellnessReminders } from "../wellness/useWellnessReminders.js";
import type { WellnessSection } from "../wellness/wellnessExercises.js";
import { WELLNESS_OPEN_EVENT } from "../wellness/wellnessExercises.js";
import { matchShellKey, tooltipWithChord } from "../../lib/keymap.js";
import { PORTAL_CHROME } from "../../lib/portal-chrome.js";
import { isDesktopClient } from "../../lib/runtimeCapabilities.js";
import {
  RibbonNavCluster,
  type AdminGroup,
  type RibbonNode,
} from "./AppRibbon.js";
import { useOfficeHealth } from "./useOfficeHealth.js";
import { SyncQueueChip } from "../SyncQueueChip.js";

const R8 = "8px";
const HIT = PORTAL_CHROME.footerHitPx;

const staffChromeIconSx = {
  ...chromeIconSx,
  width: HIT,
  height: HIT,
  "[data-hcw-coga=\"calm\"] &": {
    width: HIT,
    height: HIT,
  },
} as const;

/**
 * Staff taskbar — portal metrics (60px · floating · 35px hits).
 *
 *   LEFT   — wellness · calculator
 *   CENTER — module nav
 *   RIGHT  — flat sync · sign out
 */
export function AppFooterBar({
  planClass,
  onSignOut,
  nav = [],
  adminGroups = [],
}: {
  planClass?: string;
  onSignOut: () => void;
  nav?: RibbonNode[];
  adminGroups?: AdminGroup[];
}) {
  const navigate = useNavigate();
  const desktop = isDesktopClient();
  const [showCalc, setShowCalc] = useState(false);
  const [showWellness, setShowWellness] = useState(false);
  const [wellnessSection, setWellnessSection] = useState<WellnessSection>("breathe");
  const calcTriggerRef = useRef<HTMLButtonElement>(null);
  const wellnessTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: WellnessSection }>).detail;
      if (detail?.section) setWellnessSection(detail.section);
      setShowWellness(true);
    };
    window.addEventListener(WELLNESS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WELLNESS_OPEN_EVENT, onOpen);
  }, []);

  useWellnessReminders();

  const { state } = useOfficeHealth();
  const healthToken =
    state === "critical"
      ? "var(--cds-support-error)"
      : state === "watch"
        ? "var(--cds-support-warning)"
        : "var(--cds-support-success)";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      matchShellKey(e, {
        calculator: () => setShowCalc((o) => !o),
        search: () => navigate("/search"),
        help: () => navigate("/help"),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const trayWidth = "min(200px, 28%)";

  return (
    <Box
      className={`esti-app-footer-wrap ${planClass ?? ""}`}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: PORTAL_CHROME.chromeInsetPx,
        zIndex: PORTAL_CHROME.footerZIndex,
        px: { xs: 2, md: 3 },
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <Surface
        component="footer"
        layer="soft"
        className="hcw-surface esti-app-footer esti-portal-neu__footerbar"
        aria-label="Workspace taskbar"
        sx={{
          pointerEvents: "auto",
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
          borderTop: 2,
          borderTopColor: healthToken,
        }}
      >
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            flex: `0 0 ${trayWidth}`,
            justifyContent: "flex-start",
            minWidth: 0,
          }}
        >
          <Tooltip title="Wellness — breathe, stretch, eyes">
            <IconButton
              ref={wellnessTriggerRef}
              color={showWellness ? "primary" : "default"}
              onClick={() => setShowWellness((o) => !o)}
              aria-label="Wellness"
              sx={staffChromeIconSx}
            >
              <SelfImprovement />
            </IconButton>
          </Tooltip>
          <Tooltip title={tooltipWithChord("Calculator", "calculator")}>
            <IconButton
              ref={calcTriggerRef}
              color={showCalc ? "primary" : "default"}
              onClick={() => setShowCalc((o) => !o)}
              aria-label="Calculator"
              sx={staffChromeIconSx}
            >
              <CalculateOutlined />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box
          className="esti-app-footer__launcher-anchor"
          sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}
        >
          <RibbonNavCluster nav={nav} adminGroups={adminGroups} placement="above" />
        </Box>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            flex: `0 0 ${trayWidth}`,
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          {desktop && <SyncQueueChip flat />}
          <Tooltip title="Sign out">
            <IconButton onClick={onSignOut} aria-label="Sign out" sx={staffChromeIconSx}>
              <PowerSettingsNew />
            </IconButton>
          </Tooltip>
        </Stack>
      </Surface>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
      <WellnessReminderBanner />
      <WellnessPanel
        open={showWellness}
        onClose={() => setShowWellness(false)}
        triggerRef={wellnessTriggerRef}
        initialSection={wellnessSection}
      />
    </Box>
  );
}
