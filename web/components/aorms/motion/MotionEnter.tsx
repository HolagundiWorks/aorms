"use client";

/**
 * Mount-triggered entrance (guideline §6 — Hero only) — the hero is
 * already in view on first paint, so its reveal plays on mount, not on
 * scroll like `MotionReveal`. `step` places this piece in the hero's
 * five-step sequence (eyebrow → heading → supporting copy → CTA →
 * existing Pulse UI), each delayed one `stagger.standard` interval
 * later than the last, reproducing a staggered reveal across five
 * separately-laid-out pieces (two different Carbon `Column`s) without
 * physically nesting them under one flex/stagger parent, which would
 * have meant collapsing them out of their Columns and breaking the
 * existing Grid layout (§1 non-negotiable).
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { aormsMotion, standardTransition } from "../../../lib/motion/tokens";

export function MotionEnter({ children, step = 0 }: { children: ReactNode; step?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: aormsMotion.distance.reveal }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...standardTransition, delay: step * aormsMotion.stagger.standard }}
    >
      {children}
    </motion.div>
  );
}
