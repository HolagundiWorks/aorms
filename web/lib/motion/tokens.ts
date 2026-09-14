/**
 * Central Motion.dev tokens (AORMS UI Motion — Developer Guidelines §23,
 * introduced 2026-09-14 against `C:\Users\holag\Downloads\
 * AORMS_Motion_Dev_Guidelines.md`). Every animation on the landing page
 * reads timing/distance/stagger from here — no arbitrary per-component
 * values (§24, e.g. `transition={{ duration: 0.37 }}` inline in a
 * component). Values copied verbatim from the guideline doc's own
 * example so this file IS the guideline's central-tokens example, not a
 * reinterpretation of it.
 */
export const aormsMotion = {
  duration: {
    instant: 0.12,
    fast: 0.2,
    standard: 0.3,
    slow: 0.45,
  },
  distance: {
    micro: 4,
    reveal: 12,
    section: 20,
  },
  stagger: {
    tight: 0.04,
    standard: 0.08,
    relaxed: 0.12,
  },
} as const;

/**
 * The one shared easing/duration pairing used across reveal and entrance
 * animations on the page — `@carbon/motion`'s own `easings.standard.
 * productive` curve (verified against `node_modules/@carbon/motion/js/
 * generated/tokens.js`: `cubic-bezier(0.2, 0, 0.38, 0.9)`), not a value
 * invented for Motion, so the two systems (Carbon for what moves, Motion
 * for how) agree on easing character too.
 */
export const standardTransition = {
  duration: aormsMotion.duration.standard,
  ease: [0.2, 0, 0.38, 0.9],
} as const;
