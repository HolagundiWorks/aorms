/**
 * Floating AORMS brand mark (2026-09-14, explicit request) — the header
 * itself now shows only the firm's own name (no AORMS logo/wordmark
 * there any more, see AppShell.tsx), so the product's own brand presence
 * moves here instead: a small, subtle mark fixed to the bottom-right
 * corner of every authenticated page, rendered once in AppShell.tsx
 * (not per-page). Logo only, no "AORMS" text alongside it (explicit
 * request, same day) — the mark speaks for itself. Non-interactive
 * (`pointer-events: none`) and low z-index — a watermark, not a
 * control; never intercepts clicks on real UI and never competes with a
 * modal/popover for stacking.
 */
export function BrandWatermark() {
  return (
    <img
      src="/aorms-logo.png"
      alt=""
      aria-hidden
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 1,
        pointerEvents: "none",
        opacity: 0.35,
        height: "16px",
        width: "auto",
      }}
    />
  );
}
