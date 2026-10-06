import { placeholderFor } from "../../../lib/projects/placeholder";
import { AnimatedNumber } from "../AnimatedNumber";

/**
 * Landing demo of the Projects gallery (2026-10-06) — the portal's own gallery markup and classes
 * (`aorms-pcard*`), filled with dummy projects and the same placeholder illustrations a practice sees before
 * it uploads covers. Non-interactive (no links, no pins); hover/focus shows the name over the image, as in
 * the product. A live "tasks done" figure counts up when the board is first shown. Sample data only.
 */
const PROJECTS = [
  { ref: "DEMO-PRJ-06", title: "Silver Oak Commercial Complex", meta: "Active · Bengaluru", done: 62 },
  { ref: "DEMO-PRJ-07", title: "Iyer Residence", meta: "Completed · Chennai", done: 100 },
  { ref: "DEMO-PRJ-08", title: "Greenfield Boutique Hotel", meta: "Active · Bengaluru", done: 35 },
  { ref: "DEMO-PRJ-09", title: "Menon Residence Renovation", meta: "Active · Bengaluru", done: 78 },
  { ref: "DEMO-PRJ-10", title: "Vantage Corporate Park", meta: "Proposal · Bengaluru", done: 12 },
  { ref: "DEMO-PRJ-11", title: "Lakeview Clubhouse", meta: "Enquiry · Bengaluru", done: 0 },
] as const;

export function LiveProjects() {
  return (
    <div aria-hidden>
      <div className="aorms-pcard-grid aorms-lp-live-gallery">
        {PROJECTS.map((p) => (
          <div className="aorms-pcard" key={p.ref}>
            <div className="aorms-pcard__link">
              <div className="aorms-pcard__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={placeholderFor(p.ref)} alt="" loading="lazy" />
                <div className="aorms-pcard__veil">
                  <span className="aorms-pcard__name">{p.title}</span>
                  <span className="aorms-pcard__meta">
                    {p.ref} · {p.meta}
                  </span>
                  <span className="aorms-pcard__meta">
                    <AnimatedNumber value={p.done} kind="percent" /> of tasks done
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
