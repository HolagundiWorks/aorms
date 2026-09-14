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
import { portalUrl } from "../../lib/platform/subdomains";

/**
 * All landing-page sign-in/signup CTAs, consolidated into this one
 * component (2026-09-14, explicit direction: "move all the login,
 * signup and other CTA to this section" — the CTA band headlined "Bring
 * the practice onto one hub."). Previously split three ways: HeroCtas
 * (Sign in + a "see more" scroll link) in the hero, IdentityCtas
 * (Create Identity / Identity sign-in) in the Identity & Pricing
 * section, and this component's own office-hub Sign in + Talk to HCW.
 * HeroCtas is removed entirely (the hero now carries no CTA of its own);
 * IdentityCtas' two buttons are folded in here alongside the originals.
 * The office-hub `/login` and the Identity portal's `/platform-login`/
 * `/platform-signup` (see docs/esti/AORMS-PLATFORM-ARCHITECTURE.md)
 * stay separate targets — different logins, not the same sign-in.
 */
export function BandCtas() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem", alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Button as={Link} href="/login" renderIcon={ArrowRight}>
          Sign in
        </Button>
        <Button kind="ghost" href="mailto:hi@aorms.in">
          Talk to HCW
        </Button>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Button kind="tertiary" as={Link} href={portalUrl("identity", "/platform-signup")} renderIcon={ArrowRight}>
          Create your AORMS Identity
        </Button>
        <Button kind="ghost" as={Link} href={portalUrl("identity", "/platform-login")}>
          Already have one? Sign in
        </Button>
      </div>
    </div>
  );
}

/**
 * The ConnectDeX Partners section's own CTA (2026-09-10) — points at the
 * gated connect form (/connectdex-apply), not IdentityCtas' signup/sign-in
 * pair: creating a Company is no longer instant self-serve (see
 * platform/supabase/migrations/0013_connectdex_onboarding.sql) — a
 * prospective partner applies and waits on admin review, they don't sign
 * up directly.
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
