import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import Engineering from "@mui/icons-material/Engineering";
import HelpOutlined from "@mui/icons-material/HelpOutlined";
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
import { useLocation, useNavigate } from "react-router-dom";
import { ASK_ESTI_EVENT } from "../AiAgentCommand.js";
import { AlertsBell } from "../AlertsBell.js";
import { RuntimeHostTrayHint } from "../CapabilityBadge.js";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { WellnessPanel } from "../wellness/WellnessPanel.js";
import { WellnessReminderBanner } from "../wellness/WellnessReminderBanner.js";
import { useWellnessReminders } from "../wellness/useWellnessReminders.js";
import type { WellnessSection } from "../wellness/wellnessExercises.js";
import { WELLNESS_OPEN_EVENT } from "../wellness/wellnessExercises.js";
import { detectSurface } from "../../lib/aorms-surface-urls.js";
import { matchShellKey, tooltipWithChord } from "../../lib/keymap.js";
import { PORTAL_CHROME } from "../../lib/portal-chrome.js";
import { OfficeHealthGlyph } from "./OfficeHealthGlyph.js";
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

  // Shared LF5 keymap — calculator · search · help (Ask ESTI / Pomodoro own their IDs).
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
      {/* LEFT — calculator · office health */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1 }}>
        <Tooltip title={tooltipWithChord("Calculator", "calculator")}>
          <IconButton
            ref={calcTriggerRef}
            color={showCalc ? "primary" : "default"}
            onClick={() => setShowCalc((o) => !o)}
            aria-label="Calculator"
            sx={chromeIconSx}
          >
            <CalculateOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Office health: ${state}`}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", cursor: "pointer", pl: 0.5, minHeight: 44 }}
            onClick={() => navigate(homePath)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(homePath);
              }
            }}
            aria-label={`Office health: ${state}. Go to ${homeLabel}`}
          >
            <OfficeHealthGlyph state={state} variant="glass" title={state} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }} noWrap>{state}</Typography>
          </Stack>
        </Tooltip>
        {pendingTasks > 0 && (
          <Tooltip title="Open tasks due">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "pointer", pl: 0.5, minHeight: 44, display: "inline-flex", alignItems: "center" }}
              onClick={() => navigate("/tasks")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/tasks");
                }
              }}
            >
              {pendingTasks} due
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* CENTER — home · Tasks · Search · Ask ESTI · Wellness · Pomodoro */}
      <Stack
        direction="row"
        spacing={0.5}
        className="esti-app-footer__launcher-anchor"
        sx={{ alignItems: "center" }}
      >
        <Tooltip title={homeLabel}>
          <IconButton
            onClick={() => navigate(homePath)}
            aria-label={homeLabel}
            aria-current={homeActive ? "page" : undefined}
            color={homeActive ? "primary" : "default"}
            sx={chromeIconSx}
          >
            {isPmc || isConsultancy ? <Engineering /> : <AutoAwesome />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Tasks">
          <IconButton
            onClick={() => navigate("/tasks")}
            aria-label="Tasks"
            aria-current={pathname.startsWith("/tasks") ? "page" : undefined}
            color={pathname.startsWith("/tasks") ? "primary" : "default"}
            sx={chromeIconSx}
          >
            <TaskAltOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={tooltipWithChord("Search", "search")}>
          <IconButton
            onClick={() => navigate("/search")}
            aria-label="Search"
            aria-current={pathname.startsWith("/search") ? "page" : undefined}
            color={pathname.startsWith("/search") ? "primary" : "default"}
            sx={chromeIconSx}
          >
            <SearchOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={tooltipWithChord("Ask ESTI", "askEsti")}>
          <IconButton
            className="esti-app-footer__esti"
            onClick={() => window.dispatchEvent(new CustomEvent(ASK_ESTI_EVENT))}
            aria-label="Ask ESTI AI"
            sx={chromeIconSx}
          >
            <span className="esti-brand esti-brand--esti esti-ai-bar__mark" role="img" aria-label="ESTI" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Wellness — breathe, stretch, eyes">
          <IconButton
            ref={wellnessTriggerRef}
            color={showWellness ? "primary" : "default"}
            onClick={() => setShowWellness((o) => !o)}
            aria-label="Wellness"
            sx={chromeIconSx}
          >
            <SelfImprovement />
          </IconButton>
        </Tooltip>
        <HeaderPomodoro />
      </Stack>

      {/* RIGHT — system tray */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
        <TrayClock />
        <RuntimeHostTrayHint />
        <SyncQueueChip />
        <Tooltip title={tooltipWithChord("Keyboard shortcuts", "help")}>
          <IconButton
            onClick={() => navigate("/help")}
            aria-label="Keyboard shortcuts"
            aria-current={pathname.startsWith("/help") ? "page" : undefined}
            color={pathname.startsWith("/help") ? "primary" : "default"}
            sx={chromeIconSx}
          >
            <HelpOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <AlertsBell />
        <DemoAdminUnlock />
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton onClick={onSignOut} aria-label="Sign out" sx={chromeIconSx}>
            <PowerSettingsNew />
          </IconButton>
        </Tooltip>
      </Stack>

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
