import { Box, Button, IconButton, Popover, Stack, Tab, Tabs, Typography } from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Stop from "@mui/icons-material/Stop";
import Spa from "@mui/icons-material/Spa";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import RemoveRedEye from "@mui/icons-material/RemoveRedEye";
import { useEffect, useState, type RefObject } from "react";
import { BREATHING_PATTERNS, breathingPattern } from "@esti/contracts";
import { setWellnessPrefs, useWellnessPrefs } from "../../lib/wellnessPrefs.js";
import { BreathGuide } from "./BreathGuide.js";
import { EyeExerciseGuide } from "./EyeExerciseGuide.js";
import { StretchGuide } from "./StretchGuide.js";
import { WELLNESS_OPEN_EVENT, type WellnessSection } from "./wellnessExercises.js";
import { RADIUS } from "@hcw/ui-kit";

type Props = {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  initialSection?: WellnessSection;
  /** Footer opens above; marketing top-bar opens below. */
  placement?: "above" | "below";
  /** Popover (chrome) or full-width inline (landing section). */
  variant?: "popover" | "inline";
};

/** Short dock labels for breathing types (full name in aria). */
const BREATH_LABEL: Record<string, string> = {
  relax: "Relax",
  focus: "Focus",
  anxiety: "Calm",
  daily: "Daily",
};

/** Fixed strip for pattern / mode buttons so tabs don’t reflow height. */
const CONTROLS_ROW_H = 48;
/** Reserved corner for play/pause. */
const PLAY_SLOT = 56;

/**
 * Wellness — breathing, desk stretches, and eye exercises with animated guides.
 * Layout zones are fixed so tab switches don’t jump controls; play sits bottom-right.
 */
export function WellnessPanel({
  open,
  onClose,
  triggerRef,
  initialSection = "breathe",
  placement = "above",
  variant = "popover",
}: Props) {
  const prefs = useWellnessPrefs();
  const [section, setSection] = useState<WellnessSection>(initialSection);
  const [patternKey, setPatternKey] = useState(prefs.pattern);
  const [running, setRunning] = useState(false);
  const pattern = breathingPattern(patternKey);
  const below = placement === "below";
  const inline = variant === "inline";

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: WellnessSection }>).detail;
      if (detail?.section) setSection(detail.section);
    };
    window.addEventListener(WELLNESS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WELLNESS_OPEN_EVENT, onOpen);
  }, []);

  function choose(key: string) {
    setPatternKey(key);
    setWellnessPrefs({ pattern: key });
    setRunning(false);
  }

  function switchSection(next: WellnessSection) {
    setSection(next);
    setRunning(false);
  }

  const body = (
    <Box
      className="esti-wellness-panel__layout"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: inline ? "100%" : "auto",
        minHeight: inline ? "100%" : 340,
        boxSizing: "border-box",
        pb: `${PLAY_SLOT}px`,
      }}
    >
      {!inline ? (
        <Typography variant="subtitle2" sx={{ flexShrink: 0, mb: 1 }}>
          Wellbeing
        </Typography>
      ) : null}

      <Tabs
        value={section}
        onChange={(_, v: WellnessSection) => switchSection(v)}
        variant="fullWidth"
        sx={{
          flexShrink: 0,
          minHeight: 36,
          "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: (t) => t.typography.caption.fontSize },
        }}
      >
        <Tab value="breathe" label="Breathe" icon={<Spa sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab value="stretch" label="Stretch" icon={<FitnessCenter sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab value="eyes" label="Eyes" icon={<RemoveRedEye sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      <Box
        sx={{
          flex: "1 1 auto",
          minHeight: inline ? 0 : 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          py: 1,
        }}
      >
        {section === "breathe" ? (
          <BreathGuide pattern={pattern} running={running} onStop={() => setRunning(false)} />
        ) : null}
        {section === "stretch" ? (
          <StretchGuide running={running} onStop={() => setRunning(false)} />
        ) : null}
        {section === "eyes" ? (
          <EyeExerciseGuide running={running} onStop={() => setRunning(false)} />
        ) : null}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          height: CONTROLS_ROW_H,
          minHeight: CONTROLS_ROW_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pr: `${PLAY_SLOT}px`,
        }}
      >
        {section === "breathe" ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ justifyContent: "center", flexWrap: "wrap", rowGap: 0.5, maxWidth: "100%" }}
          >
            {BREATHING_PATTERNS.map((p) => {
              const selected = p.key === patternKey;
              const label = BREATH_LABEL[p.key] ?? p.name;
              return (
                <Button
                  key={p.key}
                  className="esti-neu-btn"
                  onClick={() => choose(p.key)}
                  aria-label={p.name}
                  aria-pressed={selected}
                  title={p.goal}
                  size="small"
                  variant={selected ? "contained" : "outlined"}
                  sx={{
                    textTransform: "none",
                    fontWeight: selected ? 700 : 600,
                    borderRadius: `${RADIUS}px`,
                    minHeight: 36,
                    height: 36,
                    px: 1.25,
                    fontSize: "0.8125rem",
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Stack>
        ) : (
          <Box aria-hidden sx={{ height: 40, width: 1 }} />
        )}
      </Box>

      <Box
        sx={{
          position: "absolute",
          right: inline ? 4 : 0,
          bottom: inline ? 4 : 0,
          zIndex: 1,
        }}
      >
        <IconButton
          className="esti-neu-btn"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause" : "Play"}
          size="large"
          color={running ? "primary" : "default"}
          sx={{
            borderRadius: "50% !important",
            width: 48,
            height: 48,
          }}
        >
          {running ? <Stop /> : <PlayArrow />}
        </IconButton>
      </Box>
    </Box>
  );

  if (inline) {
    if (!open) return null;
    return (
      <Box
        className="esti-neu esti-wellness-panel esti-wellness-panel--inline"
        sx={{
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          minHeight: "100%",
          p: { xs: 2, md: 2.5 },
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {body}
      </Box>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={triggerRef?.current ?? null}
      onClose={onClose}
      anchorOrigin={{
        vertical: below ? "bottom" : "top",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: below ? "top" : "bottom",
        horizontal: "center",
      }}
      slotProps={{ paper: { className: "esti-neu esti-wellness-panel", sx: { width: 320, p: 2.5 } } }}
    >
      {body}
    </Popover>
  );
}
