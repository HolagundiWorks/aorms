import { useEffect, useRef, useState } from "react";
import { pushToast } from "../../lib/toast.js";
import { STRETCH_ROUTINE } from "./wellnessExercises.js";

export function StretchGuide({
  running,
  onStop,
}: {
  running: boolean;
  onStop: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(STRETCH_ROUTINE[0]!.durationSec);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setStepIdx(0);
      setLeft(STRETCH_ROUTINE[0]!.durationSec);
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      let acc = 0;
      for (let i = 0; i < STRETCH_ROUTINE.length; i++) {
        const dur = STRETCH_ROUTINE[i]!.durationSec;
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
        title: "Stretch break complete",
        subtitle: "Nice — your body will thank you.",
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, onStop]);

  const step = STRETCH_ROUTINE[stepIdx]!;

  return (
    <div style={{ display: "grid", placeItems: "center", padding: "0.5rem 0", width: "100%" }}>
      <div
        className={`esti-stretch-glyph esti-stretch-glyph--${step.key}${running ? " esti-stretch-glyph--active" : ""}`}
        aria-hidden
      />
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
        {running ? `${left}s · step ${stepIdx + 1}/${STRETCH_ROUTINE.length}` : "Press play to begin"}
      </p>
    </div>
  );
}
