"use client";

import NextLink from "next/link";
import { HeaderName } from "@carbon/react";

/**
 * A plain `<HeaderName as={NextLink}>` from a Server Component crashes RSC
 * serialization — "Functions cannot be passed directly to Client
 * Components unless you explicitly expose it by marking it with 'use
 * server'" — the exact bug `not-found.tsx`/`LandingButtons.tsx`/
 * `NewDraftLinkButton.tsx` already hit and fixed for `Button`, just never
 * caught here because the check that "verified" these three portal
 * layouts only ever exercised the unauthenticated redirect path (a real
 * CLIENT/CONSULTANT/CONTRACTOR session never actually reached this
 * render until this pass's live portal click-through, 2026-09-08 — found
 * the instant a real signed-in request hit it). Isolated into its own
 * Client Component, same fix shape as the others, instead of marking
 * each portal's entire layout "use client" (which would break each
 * layout's own auth-gate redirect() calls).
 */
export function PortalHeaderName({ href, label }: { href: string; label: string }) {
  return (
    <HeaderName as={NextLink} href={href} prefix="">
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Plain <img>, not next/image — a fixed brand asset, not user content. */}
        <img src="/aorms-logo.png" alt="AORMS" style={{ height: "16px", width: "auto" }} />
        {label}
      </span>
    </HeaderName>
  );
}
