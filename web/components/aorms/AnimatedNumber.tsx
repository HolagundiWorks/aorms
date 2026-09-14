"use client";

/**
 * Count-up number, triggered once the element scrolls into view
 * (2026-09-14, explicit direction: "animate the data, animate the
 * numbers, progress bars" for the landing page's feature visuals).
 * Client Component — needs `IntersectionObserver` + `requestAnimationFrame`,
 * neither available server-side. `prefers-reduced-motion` skips straight
 * to the final value instead of animating.
 *
 * `kind` picks the display format instead of a `format` function prop —
 * every caller on this page is a Server Component, and passing a
 * function straight to a Client Component crashes with "Functions cannot
 * be passed directly to Client Components" (the same RSC boundary issue
 * documented on LandingButtons.tsx). A closed set of formats keeps this
 * usable from Server Components without needing its own "use client"
 * wrapper per caller.
 */
import { useEffect, useRef, useState } from "react";

const FORMATTERS = {
  plain: (n: number) => Math.round(n).toLocaleString("en-IN"),
  percent: (n: number) => `${Math.round(n)}%`,
  inr: (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`,
  "inr-delta": (n: number) => `+₹${Math.round(n).toLocaleString("en-IN")}`,
} as const;

export function AnimatedNumber({
  value,
  kind = "plain",
  duration = 900,
  className,
  style,
}: {
  value: number;
  kind?: keyof typeof FORMATTERS;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const format = FORMATTERS[kind];
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          // ease-out-cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(value * eased);
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {format(display)}
    </span>
  );
}
