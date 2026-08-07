/** AORMS wordmark — CSS-mask logo (`/aorms-logo.png`, Radiant Orange fill). */
import { MarketingHomeLink } from "./landing/MarketingHomeLink.js";

export function AormsLogo({
  variant = "md",
  className,
}: {
  /** `rail` auth rail · `stage` auth canvas · `hero` marketing hero · `watermark` app corner · `md` default */
  variant?: "sm" | "md" | "rail" | "stage" | "hero" | "watermark";
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="AORMS"
      className={[
        "esti-brand",
        "esti-brand--aorms",
        `esti-aorms-logo--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/** Isolated lowercase **a** from the AORMS typography logo — square mark for favicon, rail collapse, BrandMark accent. */
export function AormsMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "rail" | "stage" | "hero" | "watermark";
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="AORMS"
      className={[
        "esti-brand",
        "esti-brand--aorms-mark",
        `esti-aorms-mark--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/** Logo + optional product eyebrow / tagline for auth card headers. Logo → landing. */
export function AuthBrandBlock({
  tagline,
  product,
  logoVariant = "stage",
}: {
  tagline?: string;
  /** Short product label above the wordmark (e.g. AStudio). */
  product?: string;
  logoVariant?: "sm" | "md" | "rail" | "stage" | "hero" | "watermark";
}) {
  return (
    <div className="esti-login-brand esti-login-brand--stacked">
      {product ? <p className="esti-auth-eyebrow">{product}</p> : null}
      <MarketingHomeLink className="esti-login-brand__link">
        <AormsLogo variant={logoVariant} />
      </MarketingHomeLink>
      {tagline ? (
        <p className="esti-label esti-label--secondary esti-auth-brand-tagline">{tagline}</p>
      ) : null}
    </div>
  );
}
