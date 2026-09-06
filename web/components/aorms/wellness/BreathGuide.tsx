"use client";

/**
 * Guided breathing timer — Carbon-only rebuild of the old frontend's
 * components/wellness/BreathGuide.tsx (which drew a neumorphic MUI orb that
 * scaled with the inhale/exhale cycle). Wellness gets no custom-UI
 * exception (only Pomodoro does), so the inhale/hold/exhale cue is a plain
 * Carbon heading + countdown number instead of a shaped orb — same timing
 * logic (requestAnimationFrame against a wall-clock start time), no visual
 * chrome beyond stock type tokens.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@carbon/react";
import { cycleSeconds, type BreathingPattern } from "../../../lib/wellness/patterns";

const PHASE_LABEL: Record<string, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
  holdOut: "Hold",
  idle: "Ready",
};

export function BreathGuide({
  pattern,
  running,
  onToggle,
}: {
  pattern: BreathingPattern;
  running: boolean;
  onToggle: () => void;
}) {
  const [phase, setPhase] = useState<string>("idle");
  const [phaseLeft, setPhaseLeft] = useState(0);
  const [sessionLeft, setSessionLeft] = useState(pattern.sessionSeconds);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setPhase("idle");
      setSessionLeft(pattern.sessionSeconds);
      return;
    }
    startRef.current = performance.now();
    const cyc = cycleSeconds(pattern);
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const remain = pattern.sessionSeconds - t;
      if (remain <= 0) {
        onToggle();
        return;
      }
      setSessionLeft(Math.ceil(remain));
      const pos = t % cyc;
      const { inhale, hold, exhale } = pattern;
      if (pos < inhale) {
        setPhase("in");
        setPhaseLeft(Math.ceil(inhale - pos));
      } else if (pos < inhale + hold) {
        setPhase("hold");
        setPhaseLeft(Math.ceil(inhale + hold - pos));
      } else if (pos < inhale + hold + exhale) {
        setPhase("out");
        setPhaseLeft(Math.ceil(inhale + hold + exhale - pos));
      } else {
        setPhase("holdOut");
        setPhaseLeft(Math.ceil(cyc - pos));
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pattern]);

  const mm = Math.floor(sessionLeft / 60);
  const ss = String(sessionLeft % 60).padStart(2, "0");

  return (
    <div style={{ display: "grid", placeItems: "center", gap: "0.5rem", padding: "1rem 0", width: "100%" }}>
      <span className="cds--type-heading-05">{PHASE_LABEL[phase] ?? "Ready"}</span>
      {running ? <span className="cds--type-display-01">{phaseLeft}</span> : null}
      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
        {running ? `${mm}:${ss} left` : "Press play to begin"}
      </span>
      <Button kind={running ? "primary" : "tertiary"} size="sm" onClick={onToggle}>
        {running ? "Pause" : "Start"}
      </Button>
    </div>
  );
}
