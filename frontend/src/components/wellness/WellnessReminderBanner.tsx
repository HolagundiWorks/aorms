import CloseIcon from "@mui/icons-material/Close";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  openWellness,
  WELLNESS_REMINDER_EVENT,
  type WellnessReminderPayload,
} from "./wellnessExercises.js";

/**
 * Animated nudge above the taskbar — stretch or eye break.
 * Keeps the editorial banner classes; controls are MUI.
 */
export function WellnessReminderBanner() {
  const [active, setActive] = useState<WellnessReminderPayload | null>(null);

  useEffect(() => {
    const onReminder = (e: Event) => {
      const detail = (e as CustomEvent<WellnessReminderPayload>).detail;
      if (detail?.kind) setActive(detail);
    };
    window.addEventListener(WELLNESS_REMINDER_EVENT, onReminder);
    return () => window.removeEventListener(WELLNESS_REMINDER_EVENT, onReminder);
  }, []);

  if (!active) return null;

  const Icon = active.kind === "stretch" ? DirectionsRunIcon : VisibilityIcon;
  const section = active.kind === "stretch" ? "stretch" : "eyes";

  return (
    <Box
      className={`esti-wellness-reminder esti-wellness-reminder--${active.kind}`}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className="esti-wellness-reminder__icon-wrap" aria-hidden>
          <Icon fontSize="small" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ m: 0 }}>
            {active.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ m: 0, display: "block" }}>
            {active.subtitle}
          </Typography>
        </div>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            openWellness(section);
            setActive(null);
          }}
        >
          Start
        </Button>
        <IconButton size="small" aria-label="Dismiss reminder" onClick={() => setActive(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </Box>
  );
}
