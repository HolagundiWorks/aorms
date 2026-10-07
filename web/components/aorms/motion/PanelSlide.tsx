"use client";

/**
 * Horizontal panel transition for a tabbed workspace (2026-09-30,
 * "Architectural Operating System" — the board you slide along).
 *
 * This is a *presentation* layer over ordinary routes, deliberately not a
 * routing change: every tab is still its own URL, server-rendered, deep-
 * linkable and back-button friendly. Used from a `template.tsx` (which
 * re-mounts on every navigation within its segment), it slides the new
 * page in from the side it sits on — moving to a tab further right slides
 * in from the right, further left from the left. The previous index lives
 * at module level so it survives the re-mount. Distances/durations come
 * from lib/motion/tokens.ts; `reducedMotion="user"` turns the slide into
 * an instant swap for people who ask for it.
 */
import { MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { aormsMotion, standardTransition } from "../../../lib/motion/tokens";

// Client-only memory of the previous tab. It must never be read or written while rendering on the server: that
// module is shared across every request, so the server-rendered `initial` styles varied per request and never
// matched the client's first render (hydration mismatch on every /projects/[id]/* page).
let lastIndex = -1;

export function PanelSlide({ children, order, base }: { children: ReactNode; order: string[]; base: (pathname: string) => string }) {
  const pathname = usePathname();
  const slug = base(pathname);
  const index = Math.max(0, order.indexOf(slug));
  const onServer = typeof window === "undefined";
  const direction = onServer || lastIndex < 0 || index === lastIndex ? 0 : index > lastIndex ? 1 : -1;
  if (!onServer) lastIndex = index;

  return (
    <MotionConfig reducedMotion="user">
      <div style={{ overflowX: "clip" }}>
        <motion.div
          initial={{ opacity: 0, x: direction * aormsMotion.distance.section * 2 }}
          animate={{ opacity: 1, x: 0 }}
          transition={standardTransition}
        >
          {children}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
