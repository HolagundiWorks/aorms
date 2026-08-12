import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import EngineeringOutlined from "@mui/icons-material/EngineeringOutlined";
import FoundationOutlined from "@mui/icons-material/FoundationOutlined";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";

const DISCIPLINES = [
  {
    id: "architecture",
    label: "Architecture",
    blurb: "Studios that design and deliver buildings",
    icon: ArchitectureOutlined,
    src: "/landing/entourage/building-03.png",
  },
  {
    id: "engineering",
    label: "Engineering",
    blurb: "Structural, MEP, and civil consultancies",
    icon: EngineeringOutlined,
    src: "/landing/entourage/building-07.png",
  },
  {
    id: "construction",
    label: "Construction",
    blurb: "PMC, quantities, steel, and site governance",
    icon: FoundationOutlined,
    src: "/landing/entourage/building-11.png",
  },
] as const;

type Props = {
  /** Compact mark under the hero brand (dark band). */
  variant?: "hero" | "section";
};

/**
 * AEC industry cue — isometric building sketches + Architecture / Engineering /
 * Construction labels. Marketing only; uses public/landing/entourage assets.
 */
export function LandingAecStrip({ variant = "section" }: Props) {
  const hero = variant === "hero";
  return (
    <aside
      className={
        hero
          ? "esti-lp-aec-strip esti-lp-aec-strip--hero esti-lp-hero-in esti-lp-hero-in--5b"
          : "esti-lp-aec-strip esti-lp-aec-strip--section esti-lp-reveal"
      }
      aria-label="Built for architecture, engineering, and construction consulting"
    >
      <p className="esti-lp-aec-strip__kicker">
        {hero ? "AEC consulting suite" : `${AORMS_PLATFORM.name} · AEC industries`}
      </p>
      <ul className="esti-lp-aec-strip__list">
        {DISCIPLINES.map((d) => {
          const Icon = d.icon;
          return (
            <li key={d.id} className="esti-lp-aec-strip__cell">
              <figure className="esti-lp-aec-strip__fig">
                <img src={d.src} alt="" width={160} height={160} loading="lazy" decoding="async" />
              </figure>
              <div className="esti-lp-aec-strip__copy">
                <span className="esti-lp-aec-strip__icon" aria-hidden>
                  <Icon fontSize="inherit" />
                </span>
                <span className="esti-lp-aec-strip__label">{d.label}</span>
                {!hero ? <span className="esti-lp-aec-strip__blurb">{d.blurb}</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** Product-panel figure — one building sketch keyed by suite product id. */
const PRODUCT_FIGURE: Record<string, string> = {
  connect: "/landing/entourage/building-00.png",
  studio: "/landing/entourage/building-03.png",
  consultancy: "/landing/entourage/building-07.png",
  estimation: "/landing/entourage/building-05.png",
  bbs: "/landing/entourage/building-09.png",
  pmc: "/landing/entourage/building-11.png",
  adraft: "/landing/entourage/building-02.png",
  shilpidb: "/landing/entourage/building-14.png",
  portals: "/landing/entourage/building-08.png",
};

export function LandingProductFigure({ productId, title }: { productId: string; title: string }) {
  const src = PRODUCT_FIGURE[productId] ?? PRODUCT_FIGURE.connect;
  return (
    <figure className="esti-lp-product-fig" aria-hidden>
      <img src={src} alt="" width={220} height={220} loading="lazy" decoding="async" />
      <figcaption className="esti-lp-product-fig__cap">{title}</figcaption>
    </figure>
  );
}
