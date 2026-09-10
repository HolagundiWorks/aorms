import { Calendar, Money, UserAvatar, WarningAltFilled } from "@carbon/icons-react";
import { HERO_FLOATING_NOTICES } from "../../lib/marketing-content";

/**
 * Four separate floating notice cards over the hero (2026-09-10) — a
 * stand-in for a real product screenshot until one exists (landing-page
 * suggestion #1 from the earlier review round, still not built). Each
 * card is its own independently-positioned element, not one grouped
 * modal/panel — per explicit feedback after an initial modal version.
 * Plain Server Component: nothing here is interactive, so no "use
 * client"/state is needed the way the earlier modal version required.
 *
 * Absolutely positioned against the hero section's own `position:
 * relative` wrapper (app/page.tsx) — only shown at Carbon's `lg`
 * breakpoint and up (`.landing-hero-floats` in globals.scss), where the
 * hero text column (lg=12 of 16) actually leaves room beside it; below
 * that they'd overlap the hero copy, so they simply don't render there.
 */
const ICONS = { billing: Money, workload: WarningAltFilled, leave: UserAvatar, inspection: Calendar } as const;
const COLORS = {
  billing: "var(--cds-support-info)",
  workload: "var(--cds-support-warning)",
  leave: "var(--cds-text-secondary)",
  inspection: "var(--cds-support-success)",
} as const;

// One offset per card — a loose vertical stack, staggered in x, not a
// wild scatter (Carbon's flat, non-decorative visual language doesn't
// suit tilted/rotated "sticky note" cards).
const OFFSETS = [
  { top: "-1rem", right: "-1rem" },
  { top: "6.5rem", right: "2.5rem" },
  { top: "14rem", right: "-0.5rem" },
  { top: "21.5rem", right: "3rem" },
];

export function HeroFloatingNotices() {
  return (
    <div className="landing-hero-floats" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {HERO_FLOATING_NOTICES.map((notice, i) => {
        const Icon = ICONS[notice.kind];
        return (
          <div
            key={notice.title}
            style={{
              position: "absolute",
              ...OFFSETS[i],
              width: "15.5rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
              padding: "0.875rem 1rem",
              background: "var(--cds-layer)",
              border: "1px solid var(--cds-border-subtle)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
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
  );
}
