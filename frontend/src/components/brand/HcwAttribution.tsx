import { HUMAN_CENTRIC_WORKS } from "../../lib/product-nomenclature.js";
import { MarketingHomeLink } from "../landing/MarketingHomeLink.js";

type Variant = "rail" | "footer" | "inline" | "auth";
type LogoTone = "on-dark" | "on-light";

const LOGO_HEIGHT: Record<Variant, number> = {
  rail: 14,
  footer: 30,
  inline: 22,
  auth: 12,
};

const DEFAULT_TONE: Record<Variant, LogoTone> = {
  rail: "on-light",
  footer: "on-dark",
  inline: "on-light",
  auth: "on-light",
};

/** Human Centric Works logo + optional design credit. */
export function HcwAttribution({
  variant = "inline",
  showNote = true,
  logoTone,
  compact = false,
  className,
}: {
  variant?: Variant;
  showNote?: boolean;
  /** Logo variant — defaults from surface (black on light rail, white on orange footer). */
  logoTone?: LogoTone;
  /** Smaller logo (e.g. compact auth / footer). */
  compact?: boolean;
  className?: string;
}) {
  const tone = logoTone ?? DEFAULT_TONE[variant];
  const logoSrc =
    tone === "on-dark"
      ? HUMAN_CENTRIC_WORKS.logoOnDark
      : HUMAN_CENTRIC_WORKS.logoOnLight;
  const height = compact ? Math.round(LOGO_HEIGHT[variant] * 0.86) : LOGO_HEIGHT[variant];
  const rootClass = [
    "hcw-attribution",
    `hcw-attribution--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <MarketingHomeLink className="hcw-attribution__link">
        <img
          src={logoSrc}
          alt={HUMAN_CENTRIC_WORKS.legalName}
          className="hcw-attribution__mark"
          height={height}
          loading="lazy"
          decoding="async"
        />
      </MarketingHomeLink>
      {showNote ? (
        <p className="hcw-attribution__note">{HUMAN_CENTRIC_WORKS.attribution}</p>
      ) : null}
    </div>
  );
}
