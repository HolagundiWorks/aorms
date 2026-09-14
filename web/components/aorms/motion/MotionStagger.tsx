"use client";

/**
 * Viewport-triggered stagger container (guideline §25 lists
 * "MotionStagger" by name as an acceptable behavioral utility; §33:
 * stagger only where it improves hierarchy — a short, meaningful
 * sequence, not per-word/per-icon). Each direct child animates in with
 * the same opacity/translateY reveal as `MotionReveal`, offset one
 * `stagger.standard` interval after the previous child, once, ~15%
 * visible.
 *
 * Introduced for Revision Management (2026-09-14 follow-up: "animate
 * it ... move the next tile, move the progress bar") — the progress
 * bar and the four stage tiles now land in sequence instead of as one
 * flat block, without touching their own layout or content (stage 3's
 * cost-delta figure keeps animating exactly as it already did, via its
 * own `AnimatedNumber`).
 */
import { motion } from "motion/react";
import { Children, type ReactNode } from "react";
import { aormsMotion, standardTransition } from "../../../lib/motion/tokens";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: aormsMotion.stagger.standard } },
};

const item = {
  hidden: { opacity: 0, y: aormsMotion.distance.reveal },
  visible: { opacity: 1, y: 0, transition: standardTransition },
};

export function MotionStagger({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      {Children.map(children, (child) => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
