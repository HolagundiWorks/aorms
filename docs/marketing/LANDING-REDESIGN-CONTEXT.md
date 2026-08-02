# Landing page redesign — agent context

**Status:** Canonical brief · **Updated:** 2026-07-25 · **Owner:** HCW

Another agent or designer may own visual/layout work on the public landing. This
file captures **product and documentation context** so copy, IA, and SEO stay
aligned with the platform rebrand.

---

## What changed (2026-07)

| Before | After |
| --- | --- |
| AORMS = *Architecture Office Resource Management System* | AORMS = **Accelerated Operational Resources Management System** (platform) |
| Landing = architecture-practice-only marketing | Landing = **platform home** with three apps |
| Single / two-app story | **AStudio** · **AConsulting** · **AProc** on one spine |

Full naming rules: [AORMS-PLATFORM-NOMENCLATURE.md](../esti/AORMS-PLATFORM-NOMENCLATURE.md).  
Executable constants: `frontend/src/lib/product-nomenclature.ts`.

---

## Landing purpose (current)

The home route (`/`) is the **AORMS platform landing** (`Landing.tsx` +
`landing.scss` + `MarketingShell` / conversion dock):

- Mission: consolidate consulting + PMC workflows on one AI-enhanced spine
- **EOMS** (knowledge bank) + **ESTI** (internal AI agent)
- Three apps: **AStudio** (live) · **AConsulting** (live) · **AProc** (preview)
- Target: AEC consulting and PMC firms ~5–500 people

**SEO:** `frontend/src/lib/landing-seo.ts` · static fallback in `frontend/index.html`.  
**LLM crawl summary:** `frontend/public/llms.txt`.  
**Sitemap / RSS:** `frontend/public/sitemap.xml` · `frontend/public/blog/feed.xml`
(regenerate when adding blog posts).

Keyword SEO landings under `frontend/src/content/landing/` currently **redirect
to `/`** — keep copy aligned if routes are revived.

---

## What NOT to put on the platform landing

- India-only GST/TDS/COA deep dives as the primary hero (keep in wiki/blog)
- “Built for Indian architects” as the **only** headline (architecture is one app)
- Claiming AORMS is “consultancy-only with no PMC” — **AProc** is the PMC app
- Claiming a full P6/contractor ERP — AProc is owner-side governance
- Duplicate CTAs in the rail — **ActionDock only** ([HCW-UI-KIT.md](../esti/HCW-UI-KIT.md))

---

## Shell & design system (do not reinvent)

| Concern | Canonical reference |
| --- | --- |
| UX audit checklist | [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) |
| Spatial model | Rail · Stage · Dock — [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) |
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
