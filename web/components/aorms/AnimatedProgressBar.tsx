"use client";

/**
 * Progress bar that animates its fill from 0 to `pct` once scrolled into
 * view — same trigger pattern and reduced-motion handling as
 * AnimatedNumber, kept as a separate component since a bar has no number
 * to format, just a width to transition.
 */
import { useEffect, useRef, useState } from "react";

export function AnimatedProgressBar({
  pct,
  color,
  trackColor = "var(--cds-border-subtle)",
  height = "0.375rem",
}: {
  pct: number;
  color: string;
  trackColor?: string;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setWidth(pct);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Two rAFs: the first commits width:0, the second (next frame)
        // commits the real width, so the CSS transition actually has a
        // starting value to animate from instead of jumping straight in.
        requestAnimationFrame(() => requestAnimationFrame(() => setWidth(pct)));
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pct]);

  return (
    <div ref={ref} style={{ height, background: trackColor, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${width}%`,
          background: color,
          transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
