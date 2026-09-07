"use client";

import { useEffect } from "react";
import { recordHeartbeat } from "../../../lib/actions/platform";

const INTERVAL_MS = 60_000;

/**
 * Mounted once in app/(app)/layout.tsx — no UI, just a periodic beat while
 * the tab is actually visible, crediting the current web/ user's linked
 * AORMS Platform account (recordHeartbeat() no-ops silently if unlinked).
 * This is what makes "100 hours of using the service" mean real usage of
 * the firm app itself, not just the AORMS Platform's own pages.
 *
 * Deliberately simple: one fixed-interval beat per visible tick, no
 * partial-second accounting for shorter sessions — matches the AORMS
 * Platform plan's "roughly every 60s" spec exactly, no need for more
 * precision than the 100-hour threshold actually requires.
 */
export function UsageHeartbeat() {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      recordHeartbeat(Math.round(INTERVAL_MS / 1000)).catch(() => {
        // Best-effort — a failed beat just means slightly under-counted
        // hours, never worth surfacing to the user.
      });
    };
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
