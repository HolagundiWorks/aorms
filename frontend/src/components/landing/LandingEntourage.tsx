import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/** Extracted isometric building sketches (public/landing/entourage). */
const FIGURES = Array.from({ length: 15 }, (_, i) => `building-${String(i).padStart(2, "0")}.png`);

type Placed = {
  id: string;
  src: string;
  leftPct: number;
  topPct: number;
  height: number;
  baseOpacity: number;
  flip: boolean;
  rotate: number;
  z: number;
  /** 0 = far (slow) · 1 = near (fast) */
  depth: number;
  /** −0.5 … 0.5 — drives horizontal shear on scroll */
  sideBias: number;
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function placeFigures(count: number, seed: number): Placed[] {
  const rnd = mulberry32(seed);
  const pool = [...FIGURES];
  // Allow reuse so we can place more than 15 tiles
  while (pool.length < count) {
    pool.push(...FIGURES);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const picked = pool.slice(0, count);
  return picked.map((file, i) => {
    const side = rnd() > 0.5;
    const leftPct = side ? 0.5 + rnd() * 17 : 78 + rnd() * 18;
    // Biased toward far — clearer lag vs foreground content
    const depth = 0.08 + rnd() * 0.72;
    return {
      id: `${file}-${i}`,
      src: `/landing/entourage/${file}`,
      leftPct,
      topPct: 3 + rnd() * 92,
      // Base size × 1.25
      height: Math.round((64 + Math.floor(rnd() * 88)) * 1.25),
      baseOpacity: 0.18 + rnd() * 0.2 + depth * 0.06,
      // Isometric drawings rarely mirror well — mostly upright
      flip: false,
      rotate: (rnd() - 0.5) * 4,
      // Near figures sit above far ones
      z: Math.round(depth * 20) + i,
      depth,
      sideBias: leftPct / 100 - 0.5,
    };
  });
}

/**
 * Architectural entourage — isometric building sketches, always visible, depth parallax.
 * Decorative only (pointer-events: none).
 */
export function LandingEntourage({
  count = 18,
  seed = 42,
}: {
  count?: number;
  seed?: number;
}) {
  const placed = useMemo(() => placeFigures(count, seed), [count, seed]);
  const rootRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef(placed.map((p) => ({ depth: p.depth, sideBias: p.sideBias })));
  metaRef.current = placed.map((p) => ({ depth: p.depth, sideBias: p.sideBias }));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let raf = 0;
    const apply = () => {
      const y = window.scrollY;
      const nodes = root.querySelectorAll<HTMLElement>(".esti-lp-entourage__fig");
      const meta = metaRef.current;
      nodes.forEach((el, i) => {
        const { depth, sideBias } = meta[i] ?? { depth: 0.4, sideBias: 0 };
        // Content scrolls 1:1. Counter-translate so buildings lag behind:
        // far ≈ 55–70% undone, nearer margin ≈ 28–40% — readable depth vs stage.
        const lag = 0.55 - depth * 0.28;
        const py = y * lag;
        const px = y * lag * sideBias * 0.22;
        el.style.setProperty("--py", `${py.toFixed(1)}px`);
        el.style.setProperty("--px", `${px.toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [placed]);

  return (
    <div className="esti-lp-entourage" ref={rootRef} aria-hidden>
      {placed.map((p) => (
        <img
          key={p.id}
          className="esti-lp-entourage__fig esti-lp-entourage__fig--building"
          src={p.src}
          alt=""
          draggable={false}
          style={
            {
              left: `${p.leftPct}%`,
              top: `${p.topPct}%`,
              height: p.height,
              zIndex: p.z,
              "--op": String(p.baseOpacity),
              "--rot": `${p.rotate}deg`,
              "--flip": String(p.flip ? -1 : 1),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
