import {
  AADT,
  AORMS_CONNECT,
  AORMS_CONSULTANCY,
  AORMS_PMC,
  AORMS_STUDIO,
  AQC_BBS,
  AQC_ESTIMATION,
  ESTI,
  SHILPIDB,
} from "../../lib/product-nomenclature.js";

/**
 * One-viewport suite diagram for the landing hero — how AORMS connects.
 * Decorative map (aria-hidden on ornamental SVG); labels are live text for a11y.
 */
export function LandingEcosystemMap() {
  return (
    <div className="esti-lp-eco" role="img" aria-label="AORMS ecosystem: Connect launches practice managers and technical apps; they publish to firm portals; AADT stores geometry in ShilpiDB">
      <div className="esti-lp-eco__plane">
        {/* Online band */}
        <div className="esti-lp-eco__band esti-lp-eco__band--online">
          <span className="esti-lp-eco__band-label">Online</span>
          <div className="esti-lp-eco__node esti-lp-eco__node--portal">
            <span className="esti-lp-eco__node-title">Firm portals</span>
            <span className="esti-lp-eco__node-meta">Published updates only</span>
          </div>
        </div>

        <div className="esti-lp-eco__flow esti-lp-eco__flow--up" aria-hidden>
          <span className="esti-lp-eco__flow-line" />
          <span className="esti-lp-eco__flow-caption">publish</span>
        </div>

        {/* Hub */}
        <div className="esti-lp-eco__band esti-lp-eco__band--hub">
          <div className="esti-lp-eco__node esti-lp-eco__node--hub">
            <span className="esti-lp-eco__node-kicker">Suite core</span>
            <span className="esti-lp-eco__node-title">{AORMS_CONNECT.title}</span>
            <span className="esti-lp-eco__node-meta">Sign in · launch · catalog · DB</span>
          </div>
        </div>

        <div className="esti-lp-eco__flow esti-lp-eco__flow--down" aria-hidden>
          <span className="esti-lp-eco__flow-line" />
          <span className="esti-lp-eco__flow-caption">launch</span>
        </div>

        {/* Desktop peers */}
        <div className="esti-lp-eco__split">
          <div className="esti-lp-eco__col">
            <span className="esti-lp-eco__band-label">Practice managers</span>
            <div className="esti-lp-eco__peers">
              <div className="esti-lp-eco__node">
                <span className="esti-lp-eco__node-title">{AORMS_STUDIO.title}</span>
                <span className="esti-lp-eco__node-meta">Architecture</span>
              </div>
              <div className="esti-lp-eco__node">
                <span className="esti-lp-eco__node-title">{AORMS_CONSULTANCY.title}</span>
                <span className="esti-lp-eco__node-meta">Engineering</span>
              </div>
            </div>
            <span className="esti-lp-eco__aside">
              {ESTI.name} AI · desktop only
            </span>
          </div>

          <div className="esti-lp-eco__spine" aria-hidden>
            <span className="esti-lp-eco__spine-line" />
          </div>

          <div className="esti-lp-eco__col">
            <span className="esti-lp-eco__band-label">Technical · local</span>
            <div className="esti-lp-eco__peers esti-lp-eco__peers--triple">
              <div className="esti-lp-eco__node esti-lp-eco__node--sm">
                <span className="esti-lp-eco__node-title">{AQC_ESTIMATION.title}</span>
              </div>
              <div className="esti-lp-eco__node esti-lp-eco__node--sm">
                <span className="esti-lp-eco__node-title">{AQC_BBS.title}</span>
              </div>
              <div className="esti-lp-eco__node esti-lp-eco__node--sm">
                <span className="esti-lp-eco__node-title">{AORMS_PMC.title}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="esti-lp-eco__flow esti-lp-eco__flow--down" aria-hidden>
          <span className="esti-lp-eco__flow-line" />
          <span className="esti-lp-eco__flow-caption">geometry</span>
        </div>

        {/* Drafting */}
        <div className="esti-lp-eco__band esti-lp-eco__band--draft">
          <span className="esti-lp-eco__band-label">Drafting</span>
          <div className="esti-lp-eco__peers">
            <div className="esti-lp-eco__node">
              <span className="esti-lp-eco__node-title">{AADT.title}</span>
              <span className="esti-lp-eco__node-meta">2D CAD</span>
            </div>
            <span className="esti-lp-eco__arrow" aria-hidden>→</span>
            <div className="esti-lp-eco__node">
              <span className="esti-lp-eco__node-title">{SHILPIDB.name}</span>
              <span className="esti-lp-eco__node-meta">Geometry store</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
