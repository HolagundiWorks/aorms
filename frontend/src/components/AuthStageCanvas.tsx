import { AORMS_PORTALS, AORMS_OFFICE_HUB } from "../lib/product-nomenclature.js";
import { AormsLogo } from "./AormsLogo.js";
import { LandingContours } from "./landing/LandingContours.js";

export type AuthStageVariant = "workspace" | "portal" | "external" | "admin";

const COPY: Record<AuthStageVariant, { headline: string; subline: string }> = {
  workspace: {
    headline: AORMS_OFFICE_HUB.title,
    subline: `${AORMS_OFFICE_HUB.tagline} — clients, projects, proposals, invoicing, team, and knowledge on one web hub.`,
  },
  portal: {
    headline: AORMS_PORTALS.account.stageHeadline,
    subline: AORMS_PORTALS.account.stageSubline,
  },
  external: {
    headline: AORMS_PORTALS.external.stageHeadline,
    subline: AORMS_PORTALS.external.authTagline,
  },
  admin: {
    headline: AORMS_PORTALS.auth.licensingHeadline,
    subline: AORMS_PORTALS.auth.licensingSubline,
  },
};

/**
 * Editorial stage canvas for auth screens — brand moment, no interactive fields.
 * Wave 3 (Carbon): de-MUI'd to semantic markup on the existing editorial
 * classes (final marketing styling is Wave 5). Was MUI `Box`/`Typography`.
 */
export function AuthStageCanvas({ variant = "workspace" }: { variant?: AuthStageVariant }) {
  const copy = COPY[variant];

  return (
    <div className="esti-auth-stage" aria-hidden>
      <LandingContours />
      <div className="esti-auth-stage__inner">
        <AormsLogo variant="hero" />
        <p className="esti-auth-stage__headline">{copy.headline}</p>
        <p className="esti-auth-stage__subline">{copy.subline}</p>
      </div>
    </div>
  );
}
