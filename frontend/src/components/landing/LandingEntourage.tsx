import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/** Extracted isometric building sketches (public/landing/entourage). */
const FIGURES = Array.from({ length: 15 }, (_, i) => `building-${String(i).padStart(2, "0")}.png`);

/** Linear size multiplier vs the original depth ladder (was 3×; now 0.5× of that). */
const SIZE_SCALE = 1.5;

/** Reference viewport for overlap tests (px). */
const REF_W = 1440;
const REF_H = 900;
/** Minimum gap between bounding boxes (px at ref). Tight — denser skyline. */
const GAP_PX = 10;

type Placed = {
  id: string;
  src: string;
  leftPct: number;
  topPct: number;
  height: number;
  maxWidth: number;
  baseOpacity: number;
  flip: boolean;
  rotate: number;
  z: number;
  depth: number;
  sideBias: number;
};

type Rect = { x: number; y: number; w: number; h: number };

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function toRect(leftPct: number, topPct: number, height: number, maxWidth: number): Rect {
  const w = maxWidth;
  const h = height;
  return {
    x: (leftPct / 100) * REF_W - w / 2,
    y: (topPct / 100) * REF_H - h / 2,
    w,
    h,
  };
}

/**
 * Dense side gutters — centre stage still clear (~22–78%).
 * Multiple columns × more rows; overlap rejected with a small gap.
 */
const LEFT_COLS = [4.5, 9.5, 15, 19] as const;
const RIGHT_COLS = [81, 85.5, 90.5, 95.5] as const;
const ROW_TOPS = [8, 22, 36, 50, 64, 78, 90] as const;

function placeFigures(count: number, seed: number): Placed[] {
  const rnd = mulberry32(seed);
  const n = count % 2 === 0 ? count - 1 : count;
  const pool = [...FIGURES];
  while (pool.length < n) pool.push(...FIGURES);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  type Candidate = { leftPct: number; topPct: number; depth: number };
  const candidates: Candidate[] = [];
  const rowCount = ROW_TOPS.length;

  for (let row = 0; row < rowCount; row++) {
    const depth = row / Math.max(1, rowCount - 1);
    const topBase = ROW_TOPS[row]!;
    for (const side of ["left", "right"] as const) {
      const cols = side === "left" ? LEFT_COLS : RIGHT_COLS;
      for (let c = 0; c < cols.length; c++) {
        // Stagger: skip every other cell in a checkerboard so neighbours breathe.
        if ((row + c) % 2 === 1 && rnd() > 0.55) continue;
        const col = cols[c]!;
        candidates.push({
          leftPct: col + (rnd() - 0.5) * 0.9,
          topPct: Math.min(92, Math.max(6, topBase + (rnd() - 0.5) * 3 + (c % 2) * 2.5)),
          depth: Math.min(1, depth + c * 0.03),
        });
      }
    }
  }

  // Shuffle candidates so packing isn't strictly top-down biased.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }

  const placed: Placed[] = [];
  const occupied: Rect[] = [];

  for (let i = 0; i < candidates.length && placed.length < n; i++) {
    const slot = candidates[i]!;
    const depth = slot.depth;
    // Depth ladder × 1.5: far ≈ 108–144 · mid ≈ 168–216 · near ≈ 240–300
    const height = Math.round((72 + depth * 104 + rnd() * 24) * SIZE_SCALE);
    const maxWidth = Math.round(height * 1.05);
    // Slightly shrink collision box so silhouettes can nest without centre-on-centre stack.
    const rect = toRect(slot.leftPct, slot.topPct, height * 0.88, maxWidth * 0.88);

    const cx = slot.leftPct;
    if (cx > 22 && cx < 78) continue;
    if (occupied.some((o) => overlaps(rect, o, GAP_PX))) continue;

    occupied.push(rect);
    const file = pool[placed.length]!;
    placed.push({
      id: `${file}-${placed.length}`,
      src: `/landing/entourage/${file}`,
      leftPct: slot.leftPct,
      topPct: slot.topPct,
      height,
      maxWidth,
      baseOpacity: 0.14 + depth * 0.14 + rnd() * 0.04,
      flip: false,
      rotate: (rnd() - 0.5) * 2,
      z: Math.round(depth * 24) + placed.length,
      depth,
      sideBias: slot.leftPct / 100 - 0.5,
    });
  }

  return placed;
}

/**
 * Architectural entourage — isometric building sketches, always visible, depth parallax.
 * Decorative only (pointer-events: none).
 */
export function LandingEntourage({
  count = 15,
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const apply = () => {
      const y = window.scrollY;
      const nodes = root.querySelectorAll<HTMLElement>(".esti-lp-entourage__fig");
      const meta = metaRef.current;
      nodes.forEach((el, i) => {
        const { depth, sideBias } = meta[i] ?? { depth: 0.4, sideBias: 0 };
        const lag = 0.55 - depth * 0.28;
        const py = y * lag;
        const px = y * lag * sideBias * 0.14;
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
              maxWidth: p.maxWidth,
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
