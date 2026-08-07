import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { cycleSeconds, type BreathingPattern } from "@esti/contracts";
import { pushToast } from "../../lib/toast.js";

const PHASE_LABEL: Record<string, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
  holdOut: "Hold",
  idle: "Ready",
};

function ease(p: number): number {
  return (1 - Math.cos(Math.min(1, Math.max(0, p)) * Math.PI)) / 2;
}

/** Breathing — neumorphic orb that scales with the inhale / exhale cycle. */
export function BreathGuide({
  pattern,
  running,
  onStop,
}: {
  pattern: BreathingPattern;
  running: boolean;
  onStop: () => void;
}) {
  const [scale, setScale] = useState(0.55);
  const [phase, setPhase] = useState<string>("idle");
  const [phaseLeft, setPhaseLeft] = useState(0);
  const [sessionLeft, setSessionLeft] = useState(pattern.sessionSeconds);
  const raf = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(raf.current);
      setPhase("idle");
      setScale(0.55);
      setSessionLeft(pattern.sessionSeconds);
      return;
    }
    startRef.current = performance.now();
    const cyc = cycleSeconds(pattern);
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const remain = pattern.sessionSeconds - t;
      if (remain <= 0) {
        onStop();
        pushToast({ kind: "success", title: "Breathing session complete", subtitle: pattern.name });
        return;
      }
      setSessionLeft(Math.ceil(remain));
      const pos = t % cyc;
      const { inhale, hold, exhale } = pattern;
      if (pos < inhale) {
        setPhase("in");
        setPhaseLeft(Math.ceil(inhale - pos));
        setScale(0.55 + 0.45 * ease(pos / inhale));
      } else if (pos < inhale + hold) {
        setPhase("hold");
        setPhaseLeft(Math.ceil(inhale + hold - pos));
        setScale(1);
      } else if (pos < inhale + hold + exhale) {
        const p = (pos - inhale - hold) / exhale;
        setPhase("out");
        setPhaseLeft(Math.ceil(inhale + hold + exhale - pos));
        setScale(1 - 0.45 * ease(p));
      } else {
        setPhase("holdOut");
        setPhaseLeft(Math.ceil(cyc - pos));
        setScale(0.55);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, pattern, onStop]);

  const mm = Math.floor(sessionLeft / 60);
  const ss = String(sessionLeft % 60).padStart(2, "0");

  return (
    <Box sx={{ display: "grid", placeItems: "center", py: 1, width: "100%" }}>
      <Box className="esti-breath-orb" style={{ transform: `scale(${scale.toFixed(3)})` }}>
        <span className="esti-breath-orb__phase">{PHASE_LABEL[phase] ?? "Ready"}</span>
        {running && <span className="esti-breath-orb__count">{phaseLeft}</span>}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
        {running ? `${mm}:${ss} left` : "Press play to begin"}
      </Typography>
    </Box>
  );
}
