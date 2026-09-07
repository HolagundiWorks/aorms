"use client";

/**
 * Interactive Pomodoro dial — ported from the old frontend's
 * components/PomodoroRing.tsx. Custom SVG UI, not stock Carbon components —
 * explicitly licensed by the user as the one exception to this project's
 * otherwise-strict Pure Carbon Design System rule ("only for pomodoro you
 * can create custom ui"). Colors still come from Carbon CSS tokens
 * (--cds-support-success etc.), same as the original.
 *
 * Drag the knob to set 1–60 minutes (only while idle). Top half of the ring
 * starts a Focus session, bottom half starts a Break; click either half
 * while it's already running to pause.
 */

import { useRef, useState } from "react";
import { Button } from "@carbon/react";
import { fmtPomTime, POMODORO_MODE_LABEL, usePomodoro } from "./PomodoroContext";

const DIAL = { cx: 110, cy: 110, r: 86, vb: 220 };
const FOCUS = "var(--cds-support-success)";
const BREAK = "var(--cds-support-error)";

function dialPoint(frac: number): [number, number] {
  const a = (-90 + frac * 360) * (Math.PI / 180);
  return [DIAL.cx + DIAL.r * Math.cos(a), DIAL.cy + DIAL.r * Math.sin(a)];
}

function dialArc(frac: number): string {
  const f = Math.min(frac, 0.9999);
  const [sx, sy] = dialPoint(0);
  const [ex, ey] = dialPoint(f);
  return `M ${sx} ${sy} A ${DIAL.r} ${DIAL.r} 0 ${f > 0.5 ? 1 : 0} 1 ${ex} ${ey}`;
}

export function PomodoroRing() {
  const pom = usePomodoro();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const isBreak = pom.mode !== "work";
  const color = isBreak ? BREAK : FOCUS;

  const shownSecs = pom.running ? pom.timeLeft : pom.duration;
  const frac = Math.min(shownSecs / 3600, 1);
  const [hx, hy] = dialPoint(frac);

  function setFromPointer(e: { clientX: number; clientY: number }) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * DIAL.vb;
    const sy = ((e.clientY - rect.top) / rect.height) * DIAL.vb;
    const deg = Math.atan2(sy - DIAL.cy, sx - DIAL.cx) * (180 / Math.PI);
    let fromTop = (deg + 90) % 360;
    if (fromTop < 0) fromTop += 360;
    const minutes = Math.max(1, Math.min(60, Math.round((fromTop / 360) * 60)));
    pom.setDuration(pom.mode, minutes * 60);
  }

  const currentMinutes = Math.round(shownSecs / 60);

  /** Keyboard equivalent of dragging the knob — the pointer drag above has
   * no keyboard analogue on its own, so a focused knob also responds to
   * arrow keys. WCAG 2.1.1 (keyboard) — this custom widget is licensed to
   * look non-Carbon, not to skip keyboard operability. */
  function handleKnobKeyDown(e: React.KeyboardEvent) {
    if (pom.running) return;
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = Math.min(60, currentMinutes + 1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = Math.max(1, currentMinutes - 1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 60;
    if (next !== null) {
      e.preventDefault();
      pom.setDuration(pom.mode, next * 60);
    }
  }

  /** Enter/Space activation for the SVG shapes standing in for buttons —
   * they're real click handlers already, just also reachable by keyboard now. */
  function activateOnKey(handler: () => void) {
    return (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "0.5rem",
            height: "0.5rem",
            borderRadius: "50%",
            background: color,
          }}
        />
        <span className="cds--type-body-01">{POMODORO_MODE_LABEL[pom.mode]}</span>
      </div>

      {/* Visually-hidden, not aria-live — the SVG's own big countdown digits
          are aria-hidden (a screen reader announcing every second would be
          unusable noise), so this is the equivalent text discoverable on
          demand instead: present in the DOM, not forced on the user. */}
      <span className="cds--visually-hidden">
        {fmtPomTime(pom.timeLeft)} remaining, {pom.running ? "running" : "paused"}
      </span>

      <svg
        ref={svgRef}
        viewBox="0 0 220 220"
        width="200"
        height="200"
        style={{ touchAction: "none" }}
        onPointerMove={(e) => {
          if (dragging && !pom.running) setFromPointer(e);
        }}
        onPointerUp={(e) => {
          if (dragging) {
            (e.target as Element).releasePointerCapture?.(e.pointerId);
            setDragging(false);
          }
        }}
      >
        <path
          d="M 24 110 A 86 86 0 0 1 196 110 Z"
          fill={FOCUS}
          opacity={isBreak ? 0.06 : 0.16}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={pom.running && !isBreak ? "Pause focus session" : "Start focus session"}
          onClick={() => (pom.running && !isBreak ? pom.toggle() : pom.start("work"))}
          onKeyDown={activateOnKey(() => (pom.running && !isBreak ? pom.toggle() : pom.start("work")))}
        />
        <path
          d="M 24 110 A 86 86 0 0 0 196 110 Z"
          fill={BREAK}
          opacity={isBreak ? 0.16 : 0.06}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={pom.running && isBreak ? "Pause break" : "Start break"}
          onClick={() => (pom.running && isBreak ? pom.toggle() : pom.start("short"))}
          onKeyDown={activateOnKey(() => (pom.running && isBreak ? pom.toggle() : pom.start("short")))}
        />

        <circle cx={DIAL.cx} cy={DIAL.cy} r={DIAL.r} fill="none" stroke="var(--cds-layer-accent)" strokeWidth="10" />
        <path d={dialArc(frac)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />

        <line x1={DIAL.cx} y1={DIAL.cy} x2={hx} y2={hy} stroke={color} strokeWidth="3" opacity={0.5} />
        <circle
          cx={hx}
          cy={hy}
          r="11"
          fill={color}
          style={{ cursor: pom.running ? "not-allowed" : "grab", outlineOffset: "3px" }}
          role="slider"
          tabIndex={pom.running ? -1 : 0}
          aria-label="Session duration (minutes)"
          aria-valuemin={1}
          aria-valuemax={60}
          aria-valuenow={currentMinutes}
          aria-disabled={pom.running}
          onKeyDown={handleKnobKeyDown}
          onPointerDown={(e) => {
            if (!pom.running) {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(true);
            }
          }}
        />

        <circle cx={DIAL.cx} cy={DIAL.cy} r="46" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" />
        <text x={DIAL.cx} y={DIAL.cy - 4} textAnchor="middle" fontSize="26" fontWeight="600" fill="var(--cds-text-primary)" aria-hidden>
          {fmtPomTime(pom.timeLeft)}
        </text>
        <text
          x={DIAL.cx}
          y={DIAL.cy + 22}
          textAnchor="middle"
          fontSize="13"
          fill={color}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={pom.running ? "Pause" : "Start"}
          onClick={pom.toggle}
          onKeyDown={activateOnKey(pom.toggle)}
        >
          {pom.running ? "❚❚ Pause" : "▶ Start"}
        </text>
      </svg>

      <Button kind="ghost" size="sm" onClick={pom.reset}>
        Reset
      </Button>
    </div>
  );
}
