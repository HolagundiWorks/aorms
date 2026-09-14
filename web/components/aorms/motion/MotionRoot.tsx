"use client";

/**
 * Reduced-motion respect for the whole page (guideline §28 — mandatory,
 * not optional). `reducedMotion="user"` makes every Motion animation
 * under this provider — `MotionReveal`, `MotionEnter`, and anything
 * added later — automatically disable transforms/opacity animation when
 * the visitor's OS has "reduce motion" set, without each component
 * needing its own `useReducedMotion()` check.
 *
 * Scoped to the landing page only (wraps `app/page.tsx`'s content), not
 * the root layout — this guideline document is about the marketing
 * "webpage," not the authenticated Office Hub app, and there's no reason
 * to touch the app shell to introduce it.
 */
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
