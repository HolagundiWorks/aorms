"use client";

/**
 * Scroll-triggered viewport entrance for an existing section's content
 * (guideline §7) — opacity 0→1, translateY(reveal distance)→0, once,
 * roughly 15% of the element visible before it plays. This is the
 * example straight from the guideline doc, just factored into a
 * reusable component so every section on the page uses the identical
 * behavior/tokens rather than each hand-rolling its own `whileInView`.
 *
 * Purely a behavioral wrapper — renders one plain `motion.div` with no
 * layout or visual styling of its own (guideline §1 non-negotiable:
 * preserve existing layout/grid). Wrap a section's `<Grid>` in this, not
 * individual cards inside it — per-card/per-word staggering is exactly
 * what §33 calls out as the "bad" kind of stagger.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { aormsMotion, standardTransition } from "../../../lib/motion/tokens";

export function MotionReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: aormsMotion.distance.reveal }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={standardTransition}
    >
      {children}
    </motion.div>
  );
}
