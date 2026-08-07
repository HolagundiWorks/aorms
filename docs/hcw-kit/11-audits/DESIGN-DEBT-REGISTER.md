**2026-08-06 — Final UI: no-rail soft neu.** Staff + marketing left rail retired
([PAGE-STRUCTURE.md](../../esti/PAGE-STRUCTURE.md)). `RailLayout` is a full-width
stage header shell. Portal SoftRail = **next wave** (design session). Pure
neumorphism 1.5.0 remains (glass banned on chrome).

**2026-08-06 — Pure neumorphism 1.5.0 shipped** (Constitution Art. V amended; glass banned; SoftRail + AnalogueClock). Product surfaces remapped opaque neu.

# Design debt register â€” LIVING

**The single queue of known design debt.** Every audit deposits here; every fix
withdraws. Agents: update this file in the same change that alters a fact
(Rulebook Â§14). Ordered by severity Ã— reach. **Updated:** 2026-07-22.

## Open

### Kit defects

*None open.*

### Framework gaps

*None open â€” F1â€“F5 closed in 1.3.0 (see Retired).*

### Empirical maturity (industry-reference bar)

Published reaudit: [HCW-UX-EVALUATION.md](../../HCW-UX-EVALUATION.md) (**88/100**).  
**Kit halves shipped in 1.4.3** â€” contracts/recipes exist; **field evidence** still open:

| ID | Gap | Kit / docs (1.4.3) | Still open (product / research) |
| --- | --- | --- | --- |
| **V1** | External validation | [VALIDATION-PROTOCOL.md](VALIDATION-PROTOCOL.md) | â‰¥3 independent studies |
| **V2** | Live KPI dashboards | [HCW-UX-ADOPTION-PLAYBOOK.md](../../esti/HCW-UX-ADOPTION-PLAYBOOK.md) sink recipe | Production sink + before/after tiles |
| **V3** | Predictive models | [HCW-UX-CALIBRATION.md](../../esti/HCW-UX-CALIBRATION.md) Â· `estimateOrientMultiplier` | Holdout-calibrated coefficients |
| **V4** | Construction patterns | [HCW-CONSTRUCTION-PATTERNS.md](../../esti/HCW-CONSTRUCTION-PATTERNS.md) CP-01â€¦11 | Product UI implementations |
| **V5** | Audit persistence | `setDecisionAuditSink` Â· `ux.audit` | Durable DB â‰¥6 months |

Adoption checklist: [HCW-UX-ADOPTION-PLAYBOOK.md](../../esti/HCW-UX-ADOPTION-PLAYBOOK.md).

### Roadmap-class

*Kit halves of D15/D16 shipped in **1.4.0** â€” see [13-ROADMAPS.md](../13-ROADMAPS.md).*
Product-only remainders (not kit defects):

- **Portal SoftRail redesign** — client / consultant / contractor shells; design session next ([PAGE-STRUCTURE.md](../../esti/PAGE-STRUCTURE.md))
- **Product i18n** â€” message catalogs / locale switcher in consumer apps
- **Figma component library** â€” designer-owned `.fig` mirroring primitives
- **Variables sync ritual** â€” DesignOps (see roadmaps)

## Roadmap-class (tracked in 13-Roadmaps)

- Product i18n Â· Figma component library â€” see [13-ROADMAPS.md](../13-ROADMAPS.md).

*Assessed & sanctioned (no change): `ZonalComplianceCalculator`'s centralised
9-colour SVG plot palette â€” canvas/SVG is an explicit token-rule exception; the
values are bespoke AA-tuned and don't map to categorical `DATA_VIZ`, so forcing
tokens would regress contrast.*

## Component conformance (Quality-checklist Â§Gate)

| Component | Gate status |
| --- | --- |
| Surface, GlassRail, ActionDock, TaskbarFooter, SectionDock, HealthGlassOrb, BrandMark | âœ“ shipped pre-checklist; re-audit opportunistically |
| StatusDot, DataState, ConfirmModal, PageBreadcrumb, ToastHost, Avatar | âœ“ gate items met at promotion; render tests + visual-regression shipped |
| AwarenessStrip, ActionOutcomeBanner | âœ“ promoted with psychology suite |
| MissionHeader, ObjectiveList, PhaseStrip, ConfidenceBand, DecisionQueue, FreezeTable, KpiStrip | âœ“ 1.3.0 â€” token-driven, typed, unit-tested (`gaps.test.tsx`); styleguide specimens |

## Retired (most recent first)

- 2026-07-22 Â· **Telemetry bootstrap + freeze helpers (1.4.4)** â€” `HcwTelemetryRoot` Â· `freezeDecision` Â· CI voice-lint Â· rulebook 16â€“18 Â· ext case-study template.
- 2026-07-22 Â· **Maturity kit halves (1.4.3)** â€” FatigueOfferBanner Â· decision audit Â· calibration heuristics Â· adoption playbook Â· CP-01â€¦11 patterns Â· validation protocol Â· voice-lint Â· styleguide specimens. Field evidence for V1â€“V5 still open.
- 2026-07-22 Â· **Empathic voice + fatigue trackers (1.4.2)** â€” `VOICE` / invitational `TRUST`; `FATIGUE` + `ux.fatigue_signal`; [HCW-UX-VOICE.md](../../HCW-UX-VOICE.md).
- 2026-07-22 Â· **Framework reaudit published (1.4.1)** â€” [HCW-UX-EVALUATION.md](../../HCW-UX-EVALUATION.md) weighted **88/100**; charter Â§2.1 precedence; construction labeled aware not CPM framework; open V1â€“V5 empirical (not kit).
- 2026-07-22 Â· **Roadmap kit halves D15/D16 (1.4.0)** â€” RTL foundation (`direction`/`locale`, logical chrome, Emotion cache recipe); Figma Variables bridge (`tokens.json`/`tokens.css`); [13-ROADMAPS.md](../13-ROADMAPS.md). Product i18n + Figma component library remain DesignOps/esti.
- 2026-07-22 Â· **Kit defect sweep (1.3.1)** â€” COGA calm chrome (`chromeIconSx` + `typeScaleSx`); theme scheme-aware borders/shadows; `CAPACITY.decisionAlternatives`; catalog + HCW-UI-KIT.md sync; ConfirmModal/AwarenessStrip prop types + tests; KB/audit hygiene.
- 2026-07-21 Â· **Framework gaps F1â€“F5 closed (1.3.0)** â€” orchestration primitives + T10; CAPACITY on dock/KpiStrip; `KitRoot({ coga })`; `logUxEvent` + dock outcome; case studies in `11-audits/case-studies/`.
- 2026-07-21 Â· **UX process + framework pairing (1.2.0)** â€” `HCW-UX.md` index; `HCW-UX-PROCESS.md` (Planâ†’Improve, RACI, gates); framework charter no longer â€œframework-onlyâ€.
- 2026-07-21 Â· **UX Framework Charter (1.1.0)** â€” `HCW-UX-FRAMEWORK.md` (purposeÂ·scopeÂ·lifecycleÂ·KPIsÂ·diagram); construction overlay + KPI instrument; open F1â€“F5 framework gaps (honest vs â€œOpen: noneâ€).
- 2026-07-21 Â· **HCW Catalog 1.0.0** â€” internalised every element/component/pattern/pictogram/icon with attributes (`14-HCW-CATALOG.md`); `PICTOGRAM`/`ICON` contracts; `KitRoot`/`createHcwTheme` aliases; retired external-system mapping framing.
- 2026-07-21 Â· **UX psychology pack** â€” Cowan capacity caps, interruption budget, AwarenessStrip (Endsley), ActionOutcome (Norman), ConfirmModal slip/mistake (Reason), StatusDot shapes (Treisman/Ware), form/empty contiguity (Mayer), TRUST/COGA tokens.
- 2026-07-21 Â· **Density mode + list/search recipes (0.9.0)** â€” `densityFor` / `MuiRoot({ density })`; ButtonÂ·InputÂ·ListÂ·TableÂ·DataGridÂ·Chip wired; `searchFieldSx` + `layoutSx.listToolbar`; TaskbarFooter off raw `#ffffff`.
- 2026-07-21 Â· **Data-viz enhancement (0.8.0)** â€” sequential / diverging / semantic palettes; `chartPalette` Â· `chartChromeFor` Â· `chartRootSx` Â· `withChartSeriesColors` Â· `CHART_MARKERS`; styleguide specimen.
- 2026-07-21 Â· **MUI â†” Carbon marriage gap closure (0.7.0)** â€” `HealthGlassOrb` off `--cds-*`; Tooltip/Alert-filled/DatePicker popup tokenised; `DENSITY` + `chromeIconSx`; `DATA_VIZ_CATEGORICAL` / `chartSeriesColors`; mapping Pagination/Stepper/Charts/DatePicker â†’ ðŸŸ©; narrative docs de-Carbon-strangler.
- 2026-07-21 Â· **Layout / hierarchy gap closure (0.6.0)** â€” Carbon density borrowed into HCW tokens only: `LAYOUT` + `layoutSx`, spacing `compact`/`section`, extended `TYPE_SCALE` wired through theme; 12-col grid contract documented (explicitly not Carbon 16-col / Plex / indigo).
- 2026-07-21 Â· **Orchestra dropped** â€” removed the parallel indigo/Inter exploration (`tokens/orchestra.*`, `styleguide/`, `docs/design-system/`, indigo mission-dashboard prototype). Single visual language: `@hcw/ui-kit` (Radiant Orange Â· Urbanist). Accent helpers made scheme-aware; styleguide gained high-contrast theme CSS.
- 2026-07-12 Â· **Actionable-gap sweep:** D18 closed (3 raw-`fontSize` â†’ `TYPE_SCALE.kpi`/`.body2`; typecheck clean) Â· **Wizard template T9** documented in [05-TEMPLATES.md](../05-TEMPLATES.md) from `AccountHub.tsx` (catalog now T1â€“T9) Â· **perf bundle budget** added to hcwux CI (`scripts/size-budget.mjs`, 40 KB gzip ceiling; current ~29 KB) Â· ZonalCompliance SVG palette assessed â†’ sanctioned (canvas/SVG exception; no regressioning recolor).
- 2026-07-12 Â· **D11 closed** â€” `Clients.tsx` `TagChip` fork (Carbon `--cds-tag-*` Chip) â†’ kit `StatusDot`; both dialogs (New client Â· Create client login) gained `aria-labelledby` (WCAG 4.1.2). The last agent-actionable debt item â€” the Open queue is now empty.
- 2026-07-12 Â· **D3s closed** â€” owner signed off the dark & high-contrast schemes (accepted as shipped; the marketing-page "chrome stays light" label-cascade caveat is documented and accepted). The last human-gated theme item.
- 2026-07-11 Â· D2e VR in CI: added the `visual` job to `.github/workflows/ci.yml` (pinned `mcr.microsoft.com/playwright:v1.49.0-jammy`, builds + `vite preview` + asserts, uploads diffs on failure). Committed **linux baselines** generated in that same image â€” verified deterministic on a clean run â€” so CI is green on first run (win32 baselines kept for local dev). Vite `allowedHosts: [host.docker.internal]` added so container tooling can reach the dev server.
- 2026-07-11 Â· D2d VR baselines: 6 committed snapshots (`e2e/tests/visual-regression.spec.ts-snapshots/`, win32) â€” DS gallery top, 3 scheme specimens, primitives, landing hero; deterministic (reduced-motion + animations-disabled), verified green on a clean run. The very first run earned its keep â€” it made the dark/HC schemes visible to the agent for the first time and surfaced the marketing-page label-cascade caveat (documented in the specimen + D3s). â†’ CI wiring = D2e
- 2026-07-11 Â· **Phase-D completion sweep:** D8c â€” `meta.errorTitle` adopted on **259 mutations across ~99 files** (5 agent batches; every user-facing mutation now titles its failure toast) Â· D1b â€” optimistic writes extended to `tasks.update` (shared `listInput`, instant status/priority flips) Â· D12 â€” Pagination/Stepper/PickerDay themed in the kit (0.5.0) Â· D14 â€” desktop token now fails CLOSED (no localStorage re-persist), `install-surface-tls.sh` provisions all 9 surface hosts, CSP `wss:` tightened to `wss://DOMAIN + *.DOMAIN` Â· D5 â€” zero live `@mui/x-charts` usage found; `DATA_VIZ` mandated on first use (mapping stays ðŸŸ¨ govern-before-use) Â· D17 â€” [05-TEMPLATES.md](../05-TEMPLATES.md) documents 8 canonical page anatomies from shipped screens Â· D3 engineering â€” `MuiRoot({scheme})` + persisted Settingsâ†’Appearance switcher (preview-labelled) Â· D2c harness â€” Playwright VR spec + `visual` project (baselines = D2d)
- 2026-07-11 Â· D2b (render tests): jsdom + testing-library suite for all six promoted primitives (kit 0.4.1, **27 tests total**) â€” behaviour contracts incl. ConfirmModal's accessible name and DataState's loading/empty grammar â†’ narrowed to D2c (VR snapshots)
- 2026-07-11 Â· D2 (gallery half): `/design-system` extended as the living gallery â€” StatusDot + Avatar specimens and a **Schemes section** (light/dark/HC toggle over a ThemeProvider'd specimen panel: buttons, inputs, Switch/Checkbox, StatusDot, Avatar, error alert). DOM-verified rendering in-browser. â†’ narrowed to D2b (VR snapshots + render tests)
- 2026-07-11 Â· D10 Work tabs: merged Client/Consultant requests into one "Requests" tab (max 7 tabs; legacy slugs alias via `canonicalWorkTab`); NAVIGATION.md synced
- 2026-07-11 Â· D13 route focus: `RouteFocus` moves focus to `#esti-main` on SPA navigation (WCAG 2.4.3), skipping initial render
- 2026-07-11 Â· D6 dialog names: **106 dialogs across 64 files** gained `aria-labelledby` (WCAG 4.1.2); only the parallel-WIP `Clients.tsx` dialog remains (D11 scope)
- 2026-07-11 Â· D8b error context: `meta.errorTitle` mechanism live in the global query/mutation caches; exemplar adoption on all 6 Leads/Users mutations; convention codified in KB R8 â†’ narrowed to D8c (incremental adoption)
- 2026-07-11 Â· D1 optimistic writes: pattern established at flagship sites (Leads status dropdown un-frozen + instant; Users enable/disable instant + toast) â†’ narrowed to D1b
- 2026-07-11 Â· D4 canvas/SVG palettes: `DATA_VIZ` categorical token added (kit 0.4.0); PlanReaderPanel fully token-driven; ZonalCompliance palette centralised + 7px annotation darkened to hold AA
- 2026-07-11 Â· D7 loading grammar: 15 bare "Loadingâ€¦" replaced with skeletons across 13 files (agent batch + PortalMinutes straggler)
- 2026-07-11 Â· D9 Office menu: grouped into Office/Finance ListSubheader groups (SectionMenu learned nested groups); NAVIGATION.md synced
- 2026-07-11 Â· Toast + Avatar promoted (0.3.0); first kit test suite (15 tests)
- 2026-07-11 Â· Dark/HC recipes implemented (0.2.0) â†’ moved to D3 (sign-off)
- 2026-07-11 Â· PageBreadcrumb promoted (router-agnostic injection); last real-text inline fontSize cleared
- 2026-07-11 Â· KnowledgeBankPortal stale APIs + contract violations repaired; tree green
- 2026-07-11 Â· Kit governance: semver 0.1.0+, CHANGELOG, GOVERNANCE, sideEffects
- 2026-07-11 Â· Scheme layer + scale tokens + 8 controls themed (0.1.0)
- 2026-07-11 Â· StatusDot/DataState/ConfirmModal promoted; StatusTag delegates
- 2026-07-11 Â· A11y wave: nested-main, 44px targets, keyboard paths, skip link, aria-current, document.title, reduced-motion, autofill (24 files)
- 2026-07-11 Â· Licensing console filled TagChips â†’ StatusDot (12 files)

