# AORMS — composition principles

**Status:** Canonical · **Adopted:** 2026-08-07 · **Owner:** HCW  
**Applies to:** Landing, dashboards (Studio Intelligence), marketing shells, staff stage pages, portals.  
**Chrome SoT:** [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · **UX laws:** [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) · **Index:** [HCW-UX.md](../HCW-UX.md)

These rules govern **how** surfaces are composed — colour mass, spacing rhythm, grouping, hierarchy, and isolation. Soft neu tokens and ribbon · stage · dock chrome stay as defined in PAGE-STRUCTURE; this document adds the **composition grammar**.

---

## 1. Colour mass — 60 · 30 · 10 (fixed light)

| Share | Role | Tokens | Use |
| --- | --- | --- | --- |
| **~60%** | Field (white / Fog) | `#FFFFFF` · `#F2F4F7` · `colors.background` · `--lp-bg` | Page canvas, open stage, resting content |
| **~30%** | Structure (black / coal) | `#141517` ink · soft raised `#eceef2` · hairlines · typography | Text, chrome bars, soft Surfaces, dividers |
| **~10%** | Accent (Radiant Orange) | `#FF4F18` · `--lp-accent` | **One** primary CTA, brand mark, active/selected — never body links |

**Product default is this light ratio.** Marketing and landing **lock** it — no theme toggle on public surfaces. Staff Appearance may still offer dark / high-contrast for accessibility; those schemes remap the same roles, they do not invent a second accent.

**Do not:** scatter orange across chips, stats, and icons; use purple/indigo themes; invert the landing to dark by default.

---

## 2. Modular rhythm (8px grid)

All spacing is multiples of **8**. Prefer the scale below so ribbon → stage → cards → dock share one pulse.

| Step | px | Token (marketing) | Typical use |
| --- | --- | --- | --- |
| 1 | 8 | `unit` | Tight gaps, icon inset |
| 2 | 16 | `sm` | Inline stacks, gutter (xs) |
| 3 | 24 | `md` | Card pad, grid gap, gutter (md) |
| 5 | 40 | `lg` | Block gap inside a section |
| 8 | 64 | `xl` | Section padding (mobile) |
| 12 | 96 | `sectionY.md` | Section padding (desktop) |

Executable helpers: `frontend/src/lib/composition.ts` (`COMPOSITION_RHYTHM`) · marketing alias `frontend/src/lib/marketing-layout.ts`. Staff stage gutters: `--esti-shell-gutter` (24px).

**No random alignment.** Edges share a column (1200px marketing / shell gutters staff). Nested cards align to the same modular grid — do not offset by odd pixels for “taste.”

---

## 3. Odd-number grouping

When grouping peer elements (cards, KPI tiles, FAQ rows, table previews, hero CTAs, dock section links), prefer **odd counts: 1 · 3 · 5 · 7**.

| Context | Cap / preference | Why |
| --- | --- | --- |
| Landing sections | **5** (Overview · Outcomes · Platform · Rhythm · Start) | Already odd; keep |
| Outcome / feature cards | **3 or 5** | Avoid 2×2 / 4-up flat grids |
| Stats / KPI strip | **≤3** (Cowan) or **5** max on marketing proof | Cognitive load |
| Hero CTAs | **1 primary + 2 secondary** (= 3) | One von Restorff target |
| Dashboard KPIs | **≤4** kit `CAPACITY` (prefer 3) | Working memory |
| Tables / lists on a view | Prefer **1 or 3** primary grids, not 2 or 4 competing tables | Hierarchy |

Even counts (2, 4, 6) are allowed only when content is inherently paired (e.g. two frameworks) — then add a third supporting band or accept the pair as a single conceptual unit.

---

## 4. Vertical composition rhythm

Every surface stacks the same pulse — large to small — so muscle memory holds:

```
┌─ Chrome (soft raised · 8px · NEU_FILL) ─────────────────────────┐
│  Top ribbon / AppRibbon / portal top bar                         │
├─ Stage field (60% white/Fog) ────────────────────────────────────┤
│  Section air (64–96px)                                           │
│  ┌─ Section head (eyebrow · h2 · lead) ───────────────────────┐  │
│  │  Block gap (40px)                                            │  │
│  │  ┌─ Cards / tables (soft or flat · 24px pad · 24px gap) ──┐ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  Section air                                                     │
├─ Dock / footer (soft · same radius · same content column) ───────┤
└─ Clock (ambient · bottom-right · not competing with CTAs) ───────┘
```

| Layer | Rhythm duty |
| --- | --- |
| **Ribbon / header** | Soft raised; brand left; nav odd or minimal |
| **Section air** | Generous — landing & dashboards breathe; avoid cramped `py: 3` |
| **Cards** | Same pad + gap; odd peer count; one elevation language |
| **Action / landing dock** | Soft; primary action isolated (von Restorff); content-column width |
| **Clock** | Ambient only — never a second CTA locus |

---

## 5. Visual hierarchy → lower cognitive load

1. **One job per section** — one headline, one short lead, one primary action locus.  
2. **Type scale** — overline → h1/h2 → body → caption; never three competing “hero” sizes.  
3. **Contrast** — Coal on Fog/White (≥4.5:1 body); orange fills with **white** text only.  
4. **Progressive disclosure** — FAQ accordion; dashboard tabs; dock publishes page CTAs only.  
5. **Cowan cap** — ≤4±1 chunks in a strip (KPIs, open loops, toasts).  

---

## 6. Von Restorff effect (isolation)

The item that must be remembered or acted on is **visually isolated** — not louder everywhere.

| Surface | Isolated element |
| --- | --- |
| Landing hero | **Sign in** (contained Radiant Orange) — Create / Downloads stay outlined/text |
| Landing dock | Primary auth action · section spy stays quiet |
| Staff ActionDock | CENTER create / RIGHT commit — LEFT destroy is danger, not orange flood |
| Dashboard | One attention band or primary KPI — not five orange numbers |

**Rule:** if more than ~10% of the viewport is orange, hierarchy has failed.

---

## 7. Landing & dashboard checklist

Before shipping a landing or dashboard composition:

- [ ] Colour mass reads ~60 white/Fog · ~30 coal/structure · ~10 orange  
- [ ] Spacing uses 8px modular steps only (no random 13px / 18px)  
- [ ] Peer groups are odd (3/5/7) unless documented pair exception  
- [ ] Section vertical air ≥ 64px (sm) / 96px (md+) on marketing  
- [ ] Cards/grids share one column and one gap  
- [ ] One von Restorff primary action  
- [ ] Contrast AA on body and chrome labels  
- [ ] No left rail; dock/footer/ribbon follow PAGE-STRUCTURE  

---

## 9. How every screen inherits this

Do **not** invent per-route spacing. Shells carry the rhythm:

| Shell | Path | What inherits |
| --- | --- | --- |
| `RailLayout` | Most staff list/detail pages | Header pad · stage gap · main gap |
| `StudioAbstract` | Studio Intelligence `/` | Brief + stage column rhythm |
| `AppRibbon` + `AppFooterBar` | Staff chrome | Sticky inset · gutters (`--esti-shell-gutter: 24px`) |
| `ActionDock` | Staff CTAs | Von Restorff zones (destroy · create · commit) |
| `PortalNeuFrame` | Client / consultant / contractor / site / account | Top bar + stage air + clock clear |
| `AdminConsoleShell` | Licensing | Header · chips · stage pad |
| `AuthRailLayout` | `/login` (unified tabs) / reset / forgot | Horizontal soft card pad · pinned tab header |
| `MarketingNeuFrame` + `MARKETING_RHYTHM` | Landing / blog / downloads | Section air · odd groups |

Executable tokens: `frontend/src/lib/composition.ts` (`COMPOSITION_RHYTHM`). Marketing re-exports via `marketing-layout.ts`.

When adding a screen: wrap in the correct shell; use `COMPOSITION_RHYTHM` for any local Stack/Grid gaps; keep peer groups odd; isolate one primary CTA.

---

## 10. Anti-patterns

| Don’t | Do |
| --- | --- |
| Theme toggle on marketing | Lock 60·30·10 light |
| Four equal outcome cards | Three or five with clear primacy |
| Orange on every icon + CTA + chip | One isolated accent action |
| Tight section stacking (`py: 3`) | Modular section air (`py: 8` / `12`) |
| Misaligned card edges / mixed gutters | Single content column + 8px grid |
| Two hero clocks / watermark + clock | One AnalogueClock |
| Per-route magic spacing (13px, 18px) | `COMPOSITION_RHYTHM` steps only |

---

**Related:** [UI-SITE-MAP.md](UI-SITE-MAP.md) · [05-TEMPLATES.md](../hcw-kit/05-TEMPLATES.md) · kit `CAPACITY` / `RADIUS` / `NEU_FILL` in `vendor/hcw-ui-kit/dist/tokens.js`.
