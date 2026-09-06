"use client";

/**
 * Shared step-timer UI for the desk-stretch and eye-exercise routines —
 * Carbon-only rebuild of the old frontend's StretchGuide.tsx /
 * EyeExerciseGuide.tsx (which each drew a custom shaped "glyph" per step;
 * no custom-UI exception for Wellness, so this is plain Carbon type +a
 * ProgressBar). Same step-clock logic (requestAnimationFrame against a
 * wall-clock start time), parameterised over either WellnessStep routine.
 */

import { useEffect, useRef, useState } from "react";
import { Button, ProgressBar } from "@carbon/react";
import type { WellnessStep } from "../../../lib/wellness/exercises";

export function RoutineGuide({
  routine,
  running,
  onToggle,
}: {
  routine: WellnessStep[];
  running: boolean;
  onToggle: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(routine[0]!.durationSec);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setStepIdx(0);
      setLeft(routine[0]!.durationSec);
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      let acc = 0;
      for (let i = 0; i < routine.length; i++) {
        const dur = routine[i]!.durationSec;
        if (elapsed < acc + dur) {
          setStepIdx(i);
          setLeft(Math.ceil(acc + dur - elapsed));
          raf.current = requestAnimationFrame(tick);
          return;
        }
        acc += dur;
      }
      onToggle();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, routine]);

  const step = routine[stepIdx]!;
  const stepPct = running ? Math.max(0, Math.min(100, 100 * (1 - left / step.durationSec))) : 0;

  return (
    <div style={{ display: "grid", placeItems: "center", gap: "0.5rem", padding: "1rem 0", width: "100%" }}>
      <span className="cds--type-heading-compact-02" style={{ fontWeight: 700, textAlign: "center" }}>
        {step.name}
      </span>
      <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", textAlign: "center", maxWidth: "20rem" }}>
        {step.cue}
      </span>
      <div style={{ width: "100%", maxWidth: "16rem" }}>
        <ProgressBar
          label={`Step ${stepIdx + 1} of ${routine.length}`}
          hideLabel
          value={stepPct}
          max={100}
          size="small"
        />
      </div>
      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
        {running ? `${left}s · step ${stepIdx + 1}/${routine.length}` : "Press play to begin"}
      </span>
      <Button kind={running ? "primary" : "tertiary"} size="sm" onClick={onToggle}>
        {running ? "Pause" : "Start"}
      </Button>
    </div>
  );
}
