# Landing page redesign — agent context

**Status:** Canonical brief · **Updated:** 2026-08-08 · **Owner:** HCW

Another agent or designer may own visual/layout work on the public landing. This
file captures **product and documentation context** so copy, IA, and SEO stay
aligned with the suite rebrand. **Page chrome / tokens:** [PAGE-STRUCTURE.md](../esti/PAGE-STRUCTURE.md).

---

## What changed (2026-07 → 2026-08)

| Before | After |
| --- | --- |
| AORMS = *Architecture Office Resource Management System* | AORMS = **Accelerated Operational Resources Management System** (suite) |
| Landing = architecture-practice-only marketing | Landing = **suite home** — managers · AQC technical · AADT · ShilpiDB |
| Clear-glass left rail + SectionDock | **No left rail** — soft top bar · stage · `MarketingLandingDock` · clock |
| Staff ActionDock on marketing | Marketing uses **MarketingLandingDock** only |
| Web-parity staff ERP on apex | Apex = **marketing** (soft launch); staff on desktop; portals online |
| Apex login + installers live | Soft launch: **Coming soon** until S8 / D6 |

Full naming rules: [AORMS-PLATFORM-NOMENCLATURE.md](../esti/AORMS-PLATFORM-NOMENCLATURE.md) ·
[AORMS-SUITE.md](../esti/AORMS-SUITE.md).  
Executable constants: `frontend/src/lib/product-nomenclature.ts`.

---

## Landing purpose (current)

The home route (`/`) is the **AORMS suite landing** (`Landing.tsx` +
`landing.scss` + `MarketingNeuFrame`):

- Mission: AEC consulting suite — managers for communications; technical work local
- **EOMS** (knowledge bank) + **ESTI** (internal AI agent on desktop managers)
- Managers: **AStudio** · **AConsulting** · Technical: **AQC Estimation / BBS / PM** · Drafting: **AADT** · Geometry: **ShilpiDB**
- Target: AEC consulting and PMC firms
- Five sections: **Overview · Outcomes · Platform · Rhythm · Start**
- Licensing: **open source for now**; SaaS deferred
- Atmosphere: `LandingEntourage` (isometric buildings, marketing only)

**SEO:** `frontend/src/lib/landing-seo.ts` · static fallback in `frontend/index.html`.  
**LLM crawl summary:** `frontend/public/llms.txt`.  
**Sitemap / RSS:** `frontend/public/sitemap.xml` · `frontend/public/blog/feed.xml`
(regenerate when adding blog posts).  
**Downloads:** [WEB-PORTAL.md](../esti/WEB-PORTAL.md) — soft launch Coming soon.

**Soft launch (2026-08):** landing + blog only; no demo sign-in CTAs; apex `/login`
→ Coming soon (`VITE_MARKETING_ONLY`). See [ROADMAP.md](../esti/ROADMAP.md).

Keyword SEO landings under `frontend/src/content/landing/` currently **redirect
to `/`** — keep copy aligned if routes are revived. `/wiki*` also redirects home.

---

## What NOT to put on the platform landing

- India-only GST/TDS/COA deep dives as the primary hero (keep in wiki/blog)
- “Built for Indian architects” as the **only** headline (architecture is one app)
- Claiming AORMS is “consultancy-only with no PMC” — **AProc** is the PMC app
- Claiming a full P6/contractor ERP — AProc is owner-side governance
- Reintroducing a left marketing rail or staff ActionDock on marketing pages

---

## Shell & design system (do not reinvent)

| Concern | Canonical reference |
| --- | --- |
| Page structure · tokens · chrome | [PAGE-STRUCTURE.md](../esti/PAGE-STRUCTURE.md) |
| UX audit checklist | [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) |
| Spatial / layers how-to | [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) |
| Product names | [AORMS-PLATFORM-NOMENCLATURE.md](../esti/AORMS-PLATFORM-NOMENCLATURE.md) |
| AProc scope | [APROC-ARCHITECTURE.md](../esti/APROC-ARCHITECTURE.md) |
| Roadmap | [ROADMAP.md](../esti/ROADMAP.md) |

---

## App hosts

| App | Host |
| --- | --- |
| AStudio | `studio.aorms.in` · `/login` |
| AConsulting | `consultancy.aorms.in` |
| AProc | `proc.aorms.in` · `/pmc` |

Legacy names **AORMS-Studio / AORMS-Consultancy / AORMS-PMC** redirect — do not use
in new marketing copy.
