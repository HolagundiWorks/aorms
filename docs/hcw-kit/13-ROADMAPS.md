# Roadmaps — kit vs product

**Status:** Canonical scope split · **Adopted:** 2026-07-22  
**Replaces broken links** to absent `docs/esti/AORMS-*-ROADMAP.md` files.

| Programme | Kit (this repo) | Product / DesignOps (esti · Figma) |
| --- | --- | --- |
| **RTL** (ex-D15) | `KitRoot({ direction })` · logical chrome · Emotion cache recipe | App-wide `dir` + CacheProvider; screen audits |
| **i18n** (ex-D15) | `locale` context · injectable clock locale | Message catalogs, locale switcher, translated copy |
| **Figma Variables** (ex-D16) | `dist/tokens.json` · `dist/tokens.css` export | Import into team Variables; maintain mapping |
| **Figma component library** (ex-D16) | Spec only (catalog + styleguide) | Designer-owned `.fig` mirroring kit primitives |

## Kit readiness (shipped 1.4.0)

### RTL foundation
- `createHcwTheme({ direction: "ltr"|"rtl" })`
- `KitRoot({ direction, locale })` → `theme.direction` · `dir` · `lang` · `data-hcw-direction`
- Logical properties on GlassRail, Toast, ConfirmModal, DecisionCard, TaskbarFooter, picker header
- `createHcwRtlCacheOptions(direction, stylisPlugins)` — consumer wires `@emotion/cache` + `stylis-plugin-rtl`
- ActionDock zones stay **semantic** (destroy · create · commit), not physical flips

### Token → Figma Variables bridge
- Build emits `dist/tokens.json` (DTCG-ish) + `dist/tokens.css`
- Package exports: `@hcw/ui-kit/tokens.json` · `@hcw/ui-kit/tokens.css` · `@hcw/ui-kit/token-export`
- Import guide: [02-TOKEN-EXPORT.md](02-TOKEN-EXPORT.md)

## Still product programmes (not kit defects)

1. Full i18n framework + string catalogs in esti
2. Maintaining a Figma **component** library file against every kit primitive
3. Continuous Variables sync ownership (DesignOps ritual)
4. **Wire** [HCW-UX-ADOPTION-PLAYBOOK.md](../esti/HCW-UX-ADOPTION-PLAYBOOK.md) in esti (KPI sink, fatigue banner, audit DB)
5. Implement [HCW-CONSTRUCTION-PATTERNS.md](../esti/HCW-CONSTRUCTION-PATTERNS.md) CP-01…11 in product
6. Run [VALIDATION-PROTOCOL.md](11-audits/VALIDATION-PROTOCOL.md) studies; calibrate via [HCW-UX-CALIBRATION.md](../esti/HCW-UX-CALIBRATION.md)

Track those outside the kit defect Open queue.
