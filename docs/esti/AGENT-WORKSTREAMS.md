# AORMS active delivery — named agent crew

**Status:** PARKED (delivery closed) · **Date:** 2026-08-07  
**Parent:** [ROADMAP.md](ROADMAP.md) — **COMPLETE** · ops runbook [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)

## Delivery closed

Product/engineering delivery for AStudio · AConsulting · AProc (preview) ·
local-first LF0–LF6 · UI Waves 1–7 is **complete**. There is no active
implementation queue on [ROADMAP.md](ROADMAP.md).

Cloud agents (**Vishwakarma**, **Gagan**, **Aakash**, cloud **Bhoomi**) remain
parked. **Bhoomi2** owns optional **post-delivery ops** only (SmartScreen-
trusted cert · public installer URL · keep `/downloads` on `web_fallback`
until then). Do **not** invent sha256 or flip live installer URLs unsigned.

| Name | Role | Runtime | Owns now |
| --- | --- | --- | --- |
| **Bhoomi2** | Ops (optional) | This Windows Cursor chat | MORNING-TEST-LF4 gates · roadmap truth if reopened |
| **Vishwakarma** | CTO / orchestrator | Parked | Resume → merge queue only |
| **Gagan** | Cloud hub / sync | Parked | Resume → hub/contracts · prod `0227` |
| **Aakash** | Cloud portal / GTM | Parked | Resume → live installer URL after trusted cert |
| **Bhoomi** | Cloud desktop env | Parked | Optional parallel LF4 ops |

Prior merge wave **#55 → #56 → #51 → #53 → #54 → #49 → #57** remains on `main`.
UI Wave 7 (unified `/login` + account hub) shipped `68361264`. Roadmap close
`656abcdd`+.

## Hard boundaries (still)

| Rule | Why |
| --- | --- |
| **Do not** extract AStudio / AConsulting app code | [DESKTOP-REPOS.md](DESKTOP-REPOS.md) gate still open |
| **Do not** touch Stripe / W4 integrations | Deferred by choice |
| **Do not** edit `Projects.tsx` / `Clients.tsx` | Parallel WIP |
| **Do not** invent sha256 or flip live installer URLs unsigned | Honesty / M8 |
| Reopen delivery only via a new ROADMAP wave row | Change rule |

## Crew sync matrix (historical)

| Surface | Owner | PR / branch | Notes |
| --- | --- | --- | --- |
| Hub `syncToken` · `0227` · LF3 · bind readiness | Gagan / Bhoomi2 local | **#45/#48/#53** ✅ | Local `0227` applied |
| CI lint · worker ruff | Vishwakarma | **#55/#56** ✅ | On `main` |
| LF5 · LF6 | Aakash | **#51/#54** ✅ | On `main` |
| **WinUI 3** shell · sign · bind | Bhoomi2 | **#49** ✅ | Engineering done; SmartScreen = ops |
| Portal WinUI wording | Aakash / Bhoomi2 | **#50** | Keep `web_fallback` until trusted cert |

---

## Bhoomi2 — post-delivery ops (optional)

**Owns:** SmartScreen / public installer when cert exists · local stack health.  
**Does not:** invent release hashes · force-push · Stripe/W4 · repo extraction ·
fake “complete” on unsigned portal flip.

### Ops checklist

- [x] Host toolchain + Docker stack  
- [x] Local `0227` verified  
- [x] WinUI publish against local SPA  
- [x] ACO **dev**-signed artifact + sha256 in [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)  
- [x] `hasSyncToken` bind · `sync.pullMeta` colocated loopback  
- [x] Manifest honesty (`web_fallback` until SmartScreen + HTTPS)  
- [ ] Production / SmartScreen-trusted cert (operator)  
- [ ] HTTPS handoff + live manifests / `VITE_*_INSTALLER_URL`  
- [ ] `sync.pullMeta` against **production** hub URL  

### Key paths

- `desktop/AStudio.Shell/` · `desktop/scripts/build-winui.ps1` · `start-node.ps1`
- [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md)

---

## Parked role cards (resume later)

### Vishwakarma — orchestrator

Merge green PRs · roadmap truth if a new wave opens.

### Gagan — hub / sync

`syncToken` · HUB-API · `@esti/contracts` · prod `0227` when scheduled.

### Aakash — portal / GTM

`/downloads` live URL flip **after** signed HTTPS + sha256. LF5/LF6 already ✅.

### Bhoomi — cloud desktop env

Optional assist; physical Windows ops stay with Bhoomi2 when needed.
