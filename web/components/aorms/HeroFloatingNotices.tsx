import { Calendar, Money, UserAvatar, WarningAltFilled } from "@carbon/icons-react";
import { HERO_FLOATING_NOTICES } from "../../lib/marketing-content";

/**
 * An animated, fanned card stack over the hero (2026-09-10) — a stand-in
 * for a real product screenshot until one exists (landing-page
 * suggestion #1 from the earlier review round, still not built). All
 * four notices sit in roughly the same spot, each slightly rotated/
 * offset like a hand of cards, and a pure-CSS animation cycles through
 * them — one card pops to the front (upright, larger, on top) in turn,
 * then settles back. Plain Server Component: the animation is pure CSS
 * (`heroCardCycle0`–`3` in globals.scss, one per card, identical timing
 * shape, phase-shifted via a negative `animation-delay`) — no client
 * state/JS needed to drive it.
 *
 * Previously a tall vertical spread of separately-positioned cards; that
 * version had a real bug (a negative `top` offset pushed the first card
 * above the section entirely, overlapping the header) and, per explicit
 * feedback, wasn't the wanted effect anyway — replaced outright with
 * this compact, centered, stacked-and-animated version.
 *
 * The outer `.landing-hero-floats` div's own `display` stays fully
 * controlled by its CSS class (hidden below Carbon's `lg` breakpoint,
 * shown at and above it, in globals.scss) — nothing here sets `display`
 * inline on it, since an inline style would silently override that
 * class's media-query toggle. The flex-centering lives on a nested
 * child div instead, which is always free to be its own layout.
 */
const ICONS = { billing: Money, workload: WarningAltFilled, leave: UserAvatar, inspection: Calendar } as const;
const COLORS = {
  billing: "var(--cds-support-info)",
  workload: "var(--cds-support-warning)",
  leave: "var(--cds-text-secondary)",
  inspection: "var(--cds-support-success)",
} as const;

const CYCLE_SECONDS = 8;

// The "receded" (resting) fan per card — must match each
// `heroCardCycleN`'s own 0%/25%/100% keyframe values in globals.scss.
// Set here too as a static inline fallback: with the animation disabled
// under `prefers-reduced-motion` (globals.scss's `.landing-hero-card`
// rule), these are the values that remain, so reduced-motion visitors
// still see a proper fanned stack instead of one card fully covering
// the other three (position:absolute;inset:0 with no distinguishing
// transform/z-index would otherwise collapse them to just the last one).
const RECEDED = [
  { transform: "rotate(-6deg) translate(-0.6rem, 0.3rem) scale(0.92)", zIndex: 1 },
  { transform: "rotate(-2deg) translate(-0.2rem, 0.15rem) scale(0.92)", zIndex: 2 },
  { transform: "rotate(2deg) translate(0.2rem, 0.05rem) scale(0.92)", zIndex: 3 },
  { transform: "rotate(6deg) translate(0.6rem, -0.05rem) scale(0.92)", zIndex: 4 },
];

export function HeroFloatingNotices() {
  return (
    <div className="landing-hero-floats" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", paddingRight: "2rem" }}>
        <div style={{ position: "relative", width: "15.5rem", height: "8rem" }}>
          {HERO_FLOATING_NOTICES.map((notice, i) => {
            const Icon = ICONS[notice.kind];
            return (
              <div
                key={notice.title}
                className="landing-hero-card"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  padding: "0.875rem 1rem",
                  background: "var(--cds-layer)",
                  border: "1px solid var(--cds-border-subtle)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                  opacity: 0.65,
                  ...RECEDED[i],
                  animationName: `heroCardCycle${i}`,
                  animationDuration: `${CYCLE_SECONDS}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDelay: `${-i * (CYCLE_SECONDS / 4)}s`,
                }}
              >
                <Icon size={20} style={{ color: COLORS[notice.kind], flexShrink: 0, marginTop: "0.125rem" }} />
                <div>
                  <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {notice.title}
                  </p>
                  <p className="cds--type-body-01" style={{ marginTop: "0.125rem" }}>
                    {notice.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
