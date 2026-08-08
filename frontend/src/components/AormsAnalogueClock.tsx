/**
 * Kit AnalogueClock with the AORMS mark centred on the dial (replaces the bare hub).
 * One ambient size everywhere — staff · portal · auth · marketing.
 */
import { Box } from "@mui/material";
import { AnalogueClock, type AnalogueClockProps } from "@hcw/ui-kit";
import {
  AMBIENT_ANALOGUE_CLOCK_SIZE_PX,
  PORTAL_CHROME,
} from "../lib/portal-chrome.js";
import { AormsMark } from "./AormsLogo.js";

/** @deprecated Prefer `AMBIENT_ANALOGUE_CLOCK_SIZE_PX` from `lib/portal-chrome`. */
export const AORMS_ANALOGUE_CLOCK_SIZE = AMBIENT_ANALOGUE_CLOCK_SIZE_PX;

export function AormsAnalogueClock({
  size = AMBIENT_ANALOGUE_CLOCK_SIZE_PX,
  showSeconds,
  sx,
  className,
  ...rest
}: AnalogueClockProps) {
  const markPx = Math.max(12, Math.round(size * PORTAL_CHROME.clockMarkRatio));

  return (
    <Box
      className={className}
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        ...sx,
      }}
      {...rest}
    >
      <AnalogueClock size={size} showSeconds={showSeconds} />
      <Box
        aria-hidden
        className="esti-analogue-clock__hub"
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: markPx,
          height: markPx,
          transform: "translate(-50%, -50%)",
          zIndex: 2,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
      >
        <AormsMark className="esti-analogue-clock__mark" size="sm" />
      </Box>
    </Box>
  );
}
