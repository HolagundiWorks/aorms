import { Box, Button, Stack, Typography } from "@mui/material";
import SelfImprovement from "@mui/icons-material/SelfImprovementOutlined";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Surface, RADIUS, StatusDot } from "@hcw/ui-kit";
import { useState } from "react";
import { WellnessPanel } from "../wellness/WellnessPanel.js";

/** Fixed height for the inline wellbeing panel body (scrolls inside). */
const PANEL_HEIGHT = 420;

/** Inline wellbeing widget — open by default, fixed height, full content width. */
export function LandingWellbeingWidget() {
  const [open, setOpen] = useState(true);

  return (
    <Surface
      layer="soft"
      sx={{
        width: "100%",
        maxWidth: "100%",
        p: { xs: 2.5, md: 3 },
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", width: "100%" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Try it here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Breathe, stretch, and eye breaks — personal tools, never a scoreboard. Pomodoro lives on the orange-ringed clock.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              <StatusDot color="green" label="Personal · opt-in" />
              <StatusDot color="gray" label="ASPRF wellbeing 5%" />
            </Stack>
          </Box>
          <Button
            variant="outlined"
            startIcon={<SelfImprovement />}
            endIcon={open ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: `${RADIUS}px`,
              minHeight: 44,
              flexShrink: 0,
              alignSelf: { xs: "stretch", sm: "center" },
            }}
          >
            {open ? "Hide panel" : "Show panel"}
          </Button>
        </Stack>

        {open ? (
          <Box
            sx={{
              height: PANEL_HEIGHT,
              minHeight: PANEL_HEIGHT,
              maxHeight: PANEL_HEIGHT,
              overflow: "hidden",
              width: "100%",
              borderRadius: `${RADIUS}px`,
              border: (t) => `1px solid ${t.palette.divider}`,
              position: "relative",
            }}
          >
            <WellnessPanel open onClose={() => setOpen(false)} variant="inline" />
          </Box>
        ) : null}
      </Stack>
    </Surface>
  );
}
