import Link from "next/link";
import { portalUrl } from "../../../lib/platform/subdomains";

export type PricingPlan = {
  key: string;
  name: string;
  fit: string;
  price: string;
  suffix: string;
  /** Second price line, e.g. the annual total. */
  note: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
};

/**
 * Landing pricing (2026-10-07). One row per plan: name + fit, the monthly figure large, the annual
 * total underneath, three things that actually differ, and one action. The recommended plan carries
 * the orange rule (activity colour = "start here"). Prices arrive already formatted from the live
 * `plan_pricing` rows — nothing is hard-coded here.
 */
export function PricingPlans({ plans }: { plans: PricingPlan[] }) {
  return (
    <ul className="aorms-lp-plans">
      {plans.map((p) => (
        <li key={p.key} className={`aorms-lp-plan${p.featured ? " is-featured" : ""}`} data-analytics-event={p.featured ? "pricing_view" : undefined}>
          <div className="aorms-lp-plan__head">
            <div>
              <h3>
                {p.name}
                {p.featured && <span className="aorms-lp-plan__badge">Most popular</span>}
              </h3>
              <p className="aorms-lp-plan__fit">{p.fit}</p>
            </div>
            <p className="aorms-lp-plan__price">
              {p.price}
              {p.suffix && <small>{p.suffix}</small>}
              {p.note && <span>{p.note}</span>}
            </p>
          </div>
          <ul className="aorms-lp-plan__features">
            {p.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link
            href={p.cta.href}
            className="aorms-lp-plan__cta"
            data-analytics-event={`pricing_${p.key.toLowerCase()}_cta`}
          >
            {p.cta.label} →
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const signupHref = portalUrl("identity", "/platform-signup");
export const talkHref = portalUrl("identity", "/support");
