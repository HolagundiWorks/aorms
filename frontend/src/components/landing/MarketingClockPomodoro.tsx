import { Box, Tooltip, Typography } from "@mui/material";
import { colors } from "@hcw/ui-kit";
import { useEffect, useRef, useState } from "react";
import { AormsAnalogueClock } from "../AormsAnalogueClock.js";
import { fmtPomTime, usePomodoro } from "../../contexts/PomodoroContext.js";
import { bindingFor, matchShellKey } from "../../lib/keymap.js";
import { AMBIENT_ANALOGUE_CLOCK_SIZE_PX } from "../../lib/portal-chrome.js";

/** Dial matches ambient clocks; outer chrome keeps the Pomodoro ring clearance. */
const OUTER = Math.round(AMBIENT_ANALOGUE_CLOCK_SIZE_PX * (165 / 130));
const CX = OUTER / 2;
const CY = OUTER / 2;
/** Progress ring sits just outside the analogue face. */
const R = OUTER * (72.5 / 165);
/** Was 8 — reduced to 30%. */
const RING_STROKE = 8 * 0.3;
/** Was r=10 — reduced to 50%. */
const CROWN_R = 10 * 0.5;
const ORANGE = colors.accent;
const TRACK = colors.accentSoft;
/** Live drag floor — 5 min of a 60-min dial. */
const MIN_FRAC = 5 / 60;

function pointOnRing(frac: number): [number, number] {
  const a = (-90 + frac * 360) * (Math.PI / 180);
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

function remainingArc(frac: number): string {
  const f = Math.min(Math.max(frac, 0), 0.9999);
  if (f <= 0) return "";
  const [sx, sy] = pointOnRing(0);
  const [ex, ey] = pointOnRing(f);
  return `M ${sx} ${sy} A ${R} ${R} 0 ${f > 0.5 ? 1 : 0} 1 ${ex} ${ey}`;
}

/** Snap duration to 5-minute steps (5–60). */
function snapMinutes5(rawMinutes: number): number {
  return Math.max(5, Math.min(60, Math.round(rawMinutes / 5) * 5));
}

function fracFromPointer(
  el: SVGSVGElement,
  clientX: number,
  clientY: number,
): number {
  const rect = el.getBoundingClientRect();
  const sx = ((clientX - rect.left) / rect.width) * OUTER;
  const sy = ((clientY - rect.top) / rect.height) * OUTER;
  const deg = Math.atan2(sy - CY, sx - CX) * (180 / Math.PI);
  let fromTop = (deg + 90) % 360;
  if (fromTop < 0) fromTop += 360;
  return Math.max(MIN_FRAC, Math.min(1, fromTop / 360));
}

/**
 * Marketing chrome: one Pomodoro timer built around the analogue clock.
 * Crown follows the pointer while dragging; duration snaps to 5-min steps on release.
 */
export function MarketingClockPomodoro() {
  const pom = usePomodoro();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  /** Live ring position while dragging (0–1); null when not dragging. */
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  /** Sub-second remaining seconds for smooth ring/arm motion while running. */
  const [smoothLeft, setSmoothLeft] = useState(pom.timeLeft);
  const tickAnchor = useRef({ at: 0, left: pom.timeLeft });
  const setDurationRef = useRef(pom.setDuration);
  setDurationRef.current = pom.setDuration;
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Marketing uses a single timer — keep the shared context on work mode.
  useEffect(() => {
    if (pom.mode !== "work") pom.switchMode("work");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pom.mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      matchShellKey(e, {
        pomodoro: () => {
          if (pom.timeLeft <= 0) {
            pom.reset();
            pom.start("work");
          } else {
            pom.toggle();
          }
        },
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pom]);

  // Smooth countdown: interpolate between whole-second ticks while running.
  useEffect(() => {
    if (!pom.running) {
      setSmoothLeft(pom.timeLeft);
      return;
    }
    tickAnchor.current = { at: performance.now(), left: pom.timeLeft };
    setSmoothLeft(pom.timeLeft);
    let raf = 0;
    const frame = (now: number) => {
      const { at, left } = tickAnchor.current;
      const next = Math.max(0, left - (now - at) / 1000);
      setSmoothLeft(next);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pom.running, pom.timeLeft]);

  // Window listeners so the crown keeps tracking after leaving the tiny hit target.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !svgRef.current) return;
      setDragFrac(fracFromPointer(svgRef.current, e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current || !svgRef.current) return;
      const frac = fracFromPointer(svgRef.current, e.clientX, e.clientY);
      const minutes = snapMinutes5(frac * 60);
      setDurationRef.current("work", minutes * 60);
      draggingRef.current = false;
      setDragging(false);
      setDragFrac(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  const displayLeft = pom.running ? smoothLeft : pom.timeLeft;
  // Always map remaining seconds onto the 60-min dial (not remapped to a full 360°).
  // So a 25-min set starts at ~150° and counts down toward empty.
  const dialFrac = Math.min(Math.max(displayLeft / 3600, 0), 1);
  const frac = dragFrac ?? dialFrac;
  const [hx, hy] = pointOnRing(frac);
  const arc = remainingArc(frac);
  const active = pom.running || pom.timeLeft < pom.duration || dragging;
  const labelSeconds =
    dragFrac != null ? snapMinutes5(dragFrac * 60) * 60 : Math.ceil(displayLeft);

  function beginDrag(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (pom.running || !svgRef.current) return;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragFrac(fracFromPointer(svgRef.current, e.clientX, e.clientY));
    setDragging(true);
  }

  function onToggleClick(e: React.MouseEvent) {
    if (draggingRef.current || dragging) return;
    // Defer single-click so double-click can cancel and reset instead.
    if (e.detail > 1) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (pom.timeLeft <= 0) {
        pom.reset();
        pom.start("work");
        return;
      }
      pom.toggle();
    }, 280);
  }

  function onResetDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    draggingRef.current = false;
    setDragging(false);
    setDragFrac(null);
    pom.reset();
  }

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  return (
    <Box
      className="esti-mkt-clock-pomodoro"
      sx={{
        position: "fixed",
        right: 16,
        bottom: 88,
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.75,
      }}
    >
      <Tooltip
        title={
          pom.running
            ? `Pomodoro · ${fmtPomTime(pom.timeLeft)} — click pause · double-click reset (${bindingFor("pomodoro").chord})`
            : `Pomodoro · ${fmtPomTime(pom.timeLeft)} — click start · drag crown · double-click reset (${bindingFor("pomodoro").chord})`
        }
      >
        <Box
          component="button"
          type="button"
          aria-label={pom.running ? "Pause Pomodoro timer" : "Start Pomodoro timer"}
          aria-pressed={pom.running}
          onClick={onToggleClick}
          onDoubleClick={onResetDoubleClick}
          sx={{
            all: "unset",
            cursor: "pointer",
            position: "relative",
            width: OUTER,
            height: OUTER,
            borderRadius: "50%",
            outlineOffset: 4,
            "&:focus-visible": { outline: `2px solid ${ORANGE}` },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <AormsAnalogueClock showSeconds={!pom.running} />
          </Box>

          <Box
            component="svg"
            ref={svgRef}
            viewBox={`0 0 ${OUTER} ${OUTER}`}
            width={OUTER}
            height={OUTER}
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              touchAction: "none",
              pointerEvents: "none",
            }}
          >
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={TRACK}
              strokeWidth={RING_STROKE}
            />
            {arc ? (
              <path
                d={arc}
                fill="none"
                stroke={ORANGE}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
              />
            ) : null}
            <line
              x1={CX}
              y1={CY}
              x2={hx}
              y2={hy}
              stroke={ORANGE}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.9}
            />
            <circle
              cx={hx}
              cy={hy}
              r={CROWN_R}
              fill={ORANGE}
              stroke="#fff"
              strokeWidth={1}
              style={{
                cursor: pom.running ? "default" : dragging ? "grabbing" : "grab",
                pointerEvents: "auto",
              }}
              onPointerDown={beginDrag}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        </Box>
      </Tooltip>

      <Typography
        component="span"
        variant="caption"
        aria-live="polite"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: active ? ORANGE : "text.disabled",
          letterSpacing: "0.02em",
        }}
      >
        {fmtPomTime(labelSeconds)}
        {dragging
          ? " · set"
          : !pom.running && !active
            ? " · Pomodoro"
            : pom.running
              ? " · running"
              : " · paused"}
      </Typography>
    </Box>
  );
}
