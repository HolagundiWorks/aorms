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

- Tauri / installer / code signing (**Bhoomi**)
- Portal download UI / marketing manifests (**Aakash**)
- Stripe, W4 integrations, extracting AStudio/AConsulting app trees
