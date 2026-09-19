"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js on mount — see that file's own header for why
 * it's a deliberate no-op passthrough, not a caching layer. Registered
 * from the root layout (every page, not just the authenticated app
 * shell) so Chrome's install prompt is available from /login or the
 * landing page too, even though the installed shortcut's start_url
 * (app/manifest.ts) opens straight to /pulse.
 */
export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — a failed
      // registration (e.g. an unsupported browser) shouldn't surface as
      // an error anywhere a person would see it.
    });
  }, []);

  return null;
}
