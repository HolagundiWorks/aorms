"use client";

/**
 * Small Client Component wrapper for the landing page's Carbon `Button`s.
 * `app/page.tsx` is a Server Component (needs the auth check before render),
 * and Carbon's `Button` is a Client Component — passing it `as={Link}` or
 * `renderIcon={ArrowRight}` (component references, not plain data) straight
 * from a Server Component crashes with "Functions cannot be passed directly
 * to Client Components", the same RSC boundary issue `not-found.tsx` hit
 * earlier (see ROADMAP-CLOUD.md's UI/UX row). Isolating just the buttons
 * here — not the whole page — keeps the auth-gated redirect server-side.
 */
import Link from "next/link";
import { Button } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";

export function HeroCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", alignItems: "center" }}>
      <Button as={Link} href="/login" renderIcon={ArrowRight}>
        Sign in
      </Button>
      <Button kind="tertiary" href="#specification">
        Read the specification
      </Button>
    </div>
  );
}

export function BandCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
      <Button as={Link} href="/login" renderIcon={ArrowRight}>
        Sign in
      </Button>
      <Button kind="ghost" href="mailto:hi@aorms.in">
        Talk to HCW
      </Button>
    </div>
  );
}
