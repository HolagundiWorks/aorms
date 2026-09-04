# Agent workstreams (local-first overnight split)

> Parallel tracks for desktop + hub delivery. Prefer small PRs; update this
> file's checkboxes when an item lands. Product law: [LOCAL-FIRST.md](LOCAL-FIRST.md) ·
> roadmap: [ROADMAP.md](ROADMAP.md).
>
> **Vishwakarma** (CTO / orchestrator) merges to `main`.

## Crew

| Name | Role | Focus |
| --- | --- | --- |
| **Vishwakarma** | CTO / orchestrator | Merge PRs to `main`; unblock cross-lane deps |
| **Bhoomi** | Local desktop | Tauri / installer / code signing / first-run bind (LF4) |
| **Gagan** | Cloud hub / sync / contracts | Panel `syncToken`, `sync.*`, `@esti/contracts`, LF3 meta |
| **Aakash** | Cloud portal / GTM | Download UI, marketing manifests, web parity (LF5–LF6) |

Hard out-of-scope per agent: do not take another lane's packaging/portal work,
Stripe/W4, or edit `frontend/src/routes/Projects.tsx` / `Clients.tsx`.

## Split table (ROADMAP)

| Agent | Docs |
| --- | --- |
| **Bhoomi** | [DESKTOP-REPOS.md](DESKTOP-REPOS.md) D5–D7 · LF4 |
| **Gagan** | This § Gagan · [HUB-API.md](HUB-API.md) · DESKTOP-REPOS D1–D4 |
| **Aakash** | LF5–LF6 · portal / GTM surfaces |

## Crew sync matrix

| Surface | Owner | PR / branch | Notes |
| --- | --- | --- | --- |
| Hub `syncToken` mint · `firmFromSyncToken` · `0227` · LF3 `domainMeta` · `@esti/contracts` | **Gagan** | **#45** `cursor/hub-sync-contracts-9937` | Merge to `main` **first** |
| Tauri / installer / signing · first-run bind UX (`DesktopLicenceBind`) | **Bhoomi** | `orch/lf4-sync-bind-installer` | Rebase after #45; **drop duplicate hub/sync/docs** |
| Portal Downloads / GTM / LF5–LF6 | **Aakash** | LF5 **#51** · LF6 **#54** · CI lint **#55** · WinUI wording **#50** | Live URL waits on Bhoomi signed Setup.exe |

**Merge order (Vishwakarma):** land **#45** (Gagan hub/sync/contracts) before the LF4
desktop branch. LF4 will rebase onto `main` and drop overlapping hub files
(`licenseApi/service.ts`, `license/consumer.ts`, `sync/*`, contracts
`licensing-platform.ts`, HUB-API / LOCAL-FIRST / ROADMAP / AGENT-WORKSTREAMS /
DESKTOP-REPOS). Gagan does **not** own `desktop/` packaging or
`DesktopLicenceBind`.

---

## Gagan — Hub / sync / contracts

### Goals

1. **Panel → sync bearer** — `/platform/v1/activate` + refresh issue/persist
   `syncToken`; hub `firmFromSyncToken` resolves **legacy** `esti_license_install`
   **and** `hlp_device` → `hlp_organization.sync_firm_id`; node `license.activate`
   writes `esti_org_settings.sync_token`.
2. **Harden `sync.*` for `ESTI_ROLE=node`** — flush / pullMeta / capabilities /
   hubConfigured; no breaking wire changes without bumping [HUB-API.md](HUB-API.md).
3. **DESKTOP-REPOS contracts gate** — publish path for `@esti/contracts` (version
   note + consumer README); never a second contracts repo.
4. **LF3 spot-check** — domain meta enqueue/apply for task / estimateTotals /
   phaseProgress (`domainMeta.ts`); fix regressions only / land missing hooks.
5. **Docs sync** — HUB-API · LOCAL-FIRST · ROADMAP · DESKTOP-REPOS · this file.

### Status (2026-08-06) — Gagan

| # | Item | Status |
| --- | --- | --- |
| G1 | Panel activate/refresh returns + hashes `syncToken` on `hlp_device` | ✅ |
| G2 | Node `license.activate` / refresh persists `syncToken` | ✅ |
| G3 | `firmFromSyncToken` legacy + `hlp_device` | ✅ |
| G4 | Migration `0227_hlp_org_sync_firm` (`sync_firm_id`) | ✅ |
| G5 | `sync.flush` / `pullMeta` / `hubConfigured` node hardening + docs | ✅ |
| G6 | `@esti/contracts` `0.1.0` + README (DESKTOP-REPOS D1) | ✅ |
| G7 | LF3 `domainMeta.ts` enqueue/apply (task · estimate · phaseProgress) | ✅ |
| G8 | HUB-API.md `2026-08` + LOCAL-FIRST / ROADMAP checkboxes | ✅ |

### Handoff to Bhoomi (morning bind)

**Ready for bind test** once this PR is merged/deployed to the hub:

1. Hub has migration **0227** + `/platform/v1/activate` returns `syncToken`.
2. Node env: `ESTI_HUB_URL` **and** `ESTI_LICENSE_API_URL` (+ `ESTI_PRODUCT_API_KEY` + `INSTALL_ID`).
3. Owner `license.activate` → `sync.hubConfigured.syncReady === true`.
4. Pre-2026-08 devices: one `license.refresh` (catch-up mint) or re-activate.

### Out of scope (Gagan)

---

## Gagan — Cloud hub / sync / contracts

**Owns:** Cloud hub fidelity for desktop nodes · licence → `syncToken` · contracts for DESKTOP-REPOS gate.

### Goals

1. Verify end-to-end **panel activate / refresh → sync bearer** against
   [HUB-API.md](HUB-API.md) (`2026-08`): `/platform/v1/activate`, refresh,
   `firmFromSyncToken` (legacy + `hlp_device`), node `license.activate` persistence.
2. Harden or document gaps in `sync.*` (flush, pullMeta, capabilities, hubConfigured)
   for desktop `ESTI_ROLE=node` clients — no breaking changes without bumping hub version.
3. Advance DESKTOP-REPOS gate item: **`@esti/contracts` (or OpenAPI) published for node clients**
   — package export / version note / consumer README; do **not** invent a second contracts repo.
4. Spot-check LF3 domain meta enqueue/apply (`domainMeta.ts`, task / estimate /
   phaseProgress) for regressions from overnight work; fix only if broken.
5. Keep [HUB-API.md](HUB-API.md) and [LOCAL-FIRST.md](LOCAL-FIRST.md) in sync with code.

### Out of scope

- Tauri / installer / code signing (Bhoomi).  
- Portal download UI / marketing copy (Aakash).  
- Stripe, W4, repo extraction of app code.  
- Merge to `main` (Vishwakarma).

### Key paths

- `backend/src/modules/sync/` · `backend/src/lib/sync/`  
- `backend/src/modules/license/` · `backend/src/licensing-platform/`  
- `packages/contracts/` (esp. sync)  
- `docs/esti/HUB-API.md` · `LOCAL-FIRST.md`

### Done when

- [x] Activate → syncToken path reviewed / fixed; documented in HUB-API if behaviour changed — **merged #45**  
- [x] Contracts publish path for node clients clear (`@esti/contracts` `0.1.0` + README)  
- [x] ROADMAP / DESKTOP-REPOS gate checkbox updated (`0227` on `main`)  
- [x] PR opened for Vishwakarma to merge — **#45 merged**  

**Deploy note for Bhoomi:** hub must apply migration `0227_hlp_org_sync_firm.sql` before morning bind.

---

## Aakash — Cloud portal / GTM / UX parity

**Owns:** Web Portal readiness for signed installers · M8 honesty · LF6 leftovers · empty repo scaffolds.

### Goals

1. Prep `/downloads` + `update-manifests/{astudio,aconsulting}.json` so plugging a
   **signed** URL + sha256 is a one-line env / JSON fill (see DESKTOP-REPOS
   “Portal → installer wiring”). Do **not** point at unsigned overnight binaries.
2. Finish **LF6** open piece: Figma ↔ `@hcw/ui-kit` token sync notes or automation
   stub — UX parity checklist polish only; no hero redesign.
3. **M8 GTM:** scrub any remaining “web-only / no desktop” contradictions on public
   surfaces; keep download CTAs honest (`web_fallback` until Bhoomi signs).
4. Optionally create **empty** GitHub `AStudio` / `AConsulting` from
   `docs/esti/repo-scaffolds/` READMEs only — **no app code move**.
5. Align [WEB-PORTAL.md](WEB-PORTAL.md) / MARKET-FIT M8 item 4 status with Bhoomi’s
   publish signal (leave 🔲 until signed URL exists).
6. **LF5** web parity polish: capability badges, degraded AI UX, shared keymap / Help.

### Out of scope

- Building or signing Setup.exe (Bhoomi).  
- Hub syncToken mint logic (Gagan).  
- Extracting SPA into sibling repos.  
- Merge to `main` (Vishwakarma).

### Key paths

- `frontend/src/routes/Downloads.tsx` · `DocsHub.tsx` · `AccountPortal.tsx`  
- `frontend/src/lib/desktop-installers.ts` · `frontend/public/update-manifests/`  
- `frontend/src/content/blog/` · landing SEO / nomenclature imports  
- `docs/esti/repo-scaffolds/` · [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) LF5–LF6

### Done when

- [x] Manifest / env wiring ready for signed assets (placeholders documented) — **merged #46**  
- [x] M8 copy honesty pass complete  
- [x] LF6 Figma/token item advanced or explicitly scoped with next step  
- [x] Optional empty GitHub scaffolds created without app code (`docs/esti/repo-scaffolds/`)  
- [x] PR opened for Vishwakarma to merge — **#46 merged**  
- [x] LF5 capability badges · Hosted AI UX · shared keymap + `/help`  
- [x] LF6 Inspector / Ask ESTI **one right slot** — `RightSlot` + `AskEstiPanel` + `lib/right-slot.ts` (Properties ↔ Ask; `CapabilityBadge` in Ask tab; rebased on #51).  

**Still 🔲:** live download URL flip (wait on Bhoomi signed WinUI URL + sha256).

**Status (2026-08-06, Aakash):** `/downloads` one-line fill fields confirmed exact in [WEB-PORTAL.md](WEB-PORTAL.md) (Option A env / Option B manifest+flag); placeholders stay `web_fallback`. Visual regression job on `main` fails **before** landing-hero screenshot — contracts `ActivateResult.syncToken` duplicate TS1117 (#55/#51); **not** a hero baseline drift from portal lanes.

**Status (2026-08-06, Aakash):** LF6 #54 rebased on LF5 tip; download URL flip still gated; CI lint green-up in #55.

---

## Handoffs

| From → To | Artifact |
| --- | --- |
| Bhoomi → Aakash | Signed Setup.exe URL, version, sha256 |
| Gagan → Bhoomi | Confirm activate→syncToken API ready for morning bind test |
| Aakash → Bhoomi | Exact env vars / JSON fields to fill after signing |
| Any workstream → Vishwakarma | Green PR targeting `main` |
| Vishwakarma → ROADMAP | Flip ✅ / 🚧 in merge commit or follow-up |

## Coordination

- Prefer **separate PRs** per agent.  
- If Gagan and Aakash both touch `ROADMAP.md`, Vishwakarma rebases — append status lines.  
- Bhoomi should not wait on Aakash; Aakash waits on Bhoomi for live download URLs.  
- Vishwakarma does not merge portal installer URL flips until Bhoomi’s handoff is signed.
