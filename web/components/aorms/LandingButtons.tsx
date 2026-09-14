"use client";

/**
 * Small Client Component wrapper for the landing page's Carbon `Button`s.
 * `app/page.tsx` is a Server Component (needs the auth check before render),
 * and Carbon's `Button` is a Client Component — passing it `as={Link}` or
 * `renderIcon={ArrowRight}` (component references, not plain data) straight
 * from a Server Component crashes with "Functions cannot be passed directly
 * to Client Components". Isolating just the buttons here — not the whole
 * page — keeps the auth-gated redirect server-side.
 *
 * 2026-09-14 landing rebuild (spec §4, §27, §36) — CTAs rewritten around
 * the spec's own hierarchy: primary "Explore Live Demo", secondary
 * "Start Free", each carrying a `data-analytics-event` marker (spec §36)
 * so a future analytics vendor can wire real tracking without touching
 * markup again — no vendor is actually integrated yet (see
 * docs/esti/ROADMAP.md's dated entry).
 */
import Link from "next/link";
import { Button } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { portalUrl } from "../../lib/platform/subdomains";

export function ExploreDemoButton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <Button as={Link} href="#live-demo" size={size} data-analytics-event="hero_demo_click">
      Explore Demo
    </Button>
  );
}

/** Hero CTAs (spec §4): primary "Explore Live Demo", secondary "Start Free". */
export function HeroCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
      <Button as={Link} href="#live-demo" renderIcon={ArrowRight} data-analytics-event="hero_demo_click">
        Explore Live Demo
      </Button>
      <Button
        kind="tertiary"
        as={Link}
        href={portalUrl("identity", "/platform-signup")}
        renderIcon={ArrowRight}
        data-analytics-event="hero_start_free"
      >
        Start Free
      </Button>
    </div>
  );
}

/** Live Demo section CTAs (spec §26): "Enter Live Demo" + "Create Your Practice". */
export function LiveDemoCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
      <Button as={Link} href="/login" renderIcon={ArrowRight} data-analytics-event="live_demo_enter">
        Enter Live Demo
      </Button>
      <Button kind="tertiary" as={Link} href={portalUrl("identity", "/platform-signup")} data-analytics-event="signup_start">
        Create Your Practice
      </Button>
    </div>
  );
}

/** Final CTA band (spec §27): "Start Free" + "Explore Live Demo". */
export function FinalCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
      <Button as={Link} href={portalUrl("identity", "/platform-signup")} renderIcon={ArrowRight} data-analytics-event="hero_start_free">
        Start Free
      </Button>
      <Button kind="tertiary" as={Link} href="#live-demo" data-analytics-event="hero_demo_click">
        Explore Live Demo
      </Button>
    </div>
  );
}

/**
 * The ConnectDeX Partners section's own CTA — points at the gated
 * connect form (/connectdex-apply), not a signup/sign-in pair: creating
 * a Company is admin-reviewed, not instant self-serve.
 */
export function ConnectDexCtas() {
  return (
    <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
      <Button as={Link} href={portalUrl("connectdex", "/connectdex-apply")} renderIcon={ArrowRight}>
        Apply to become a Partner
      </Button>
      <Button kind="tertiary" as={Link} href={portalUrl("connectdex", "/platform-login")}>
        Already a partner? Sign in
      </Button>
    </div>
  );
}
