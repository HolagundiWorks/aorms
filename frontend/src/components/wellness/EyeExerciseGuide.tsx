import { useEffect, useRef, useState } from "react";
import { pushToast } from "../../lib/toast.js";
import { EYE_ROUTINE } from "./wellnessExercises.js";

export function EyeExerciseGuide({
  running,
  onStop,
}: {
  running: boolean;
  onStop: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(EYE_ROUTINE[0]!.durationSec);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setStepIdx(0);
      setLeft(EYE_ROUTINE[0]!.durationSec);
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      let acc = 0;
      for (let i = 0; i < EYE_ROUTINE.length; i++) {
        const dur = EYE_ROUTINE[i]!.durationSec;
        if (elapsed < acc + dur) {
          setStepIdx(i);
          setLeft(Math.ceil(acc + dur - elapsed));
          raf.current = requestAnimationFrame(tick);
          return;
        }
        acc += dur;
      }
      onStop();
      pushToast({
        kind: "success",
        title: "Eye break complete",
        subtitle: "Screen strain eased — back to work when ready.",
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, onStop]);

  const step = EYE_ROUTINE[stepIdx]!;

  return (
    <div style={{ display: "grid", placeItems: "center", padding: "0.5rem 0", width: "100%" }}>
      <div
        className={`esti-eye-glyph esti-eye-glyph--${step.key}${running ? " esti-eye-glyph--active" : ""}`}
        aria-hidden
      >
        <span className="esti-eye-glyph__iris" />
      </div>
      <p className="cds--type-heading-compact-01" style={{ marginTop: "0.75rem", textAlign: "center" }}>
        {step.name}
      </p>
      <p
        className="cds--type-body-01"
        style={{ textAlign: "center", padding: "0 0.5rem", color: "var(--cds-text-secondary)" }}
      >
        {step.cue}
      </p>
      <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
        {running ? `${left}s · step ${stepIdx + 1}/${EYE_ROUTINE.length}` : "Press play to begin"}
      </p>
    </div>
  );
}
