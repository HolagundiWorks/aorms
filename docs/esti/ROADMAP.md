# AORMS Implementation Roadmap

**Status:** ACTIVE (suite soft launch) · **Updated:** 2026-08-08  
**Canon:** [AORMS-SUITE.md](AORMS-SUITE.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md) ·  
[DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [WEB-PORTAL.md](WEB-PORTAL.md) · [VPS-INSTALL.md](VPS-INSTALL.md)

Open source for now; SaaS licensing deferred.

---

## Soft launch (aorms.in — now)

| Surface | State |
| --- | --- |
| `/` suite landing | ✅ Live |
| `/blog` (+ suite explainers) | ✅ Live |
| `/downloads` | ✅ Live — installers **Coming soon** |
| Apex `/login` · accounts | ⏸ Soft launch — **Coming soon** (`VITE_MARKETING_ONLY`) |
| Signed Windows installers | 🔲 D6 |
| Firm portal demos on apex | ⏸ After soft launch |

Gate: `VITE_MARKETING_ONLY` (default on for public builds) · `frontend/src/lib/marketing-gate.ts`.

---

## Suite waves

| # | Work | Where | Exit |
| --- | --- | --- | --- |
| S0 | Suite canon docs | esti | ✅ [AORMS-SUITE.md](AORMS-SUITE.md) |
| S1 | Mongo ops spike + portal read | esti hub | ✅ [MONGO-OPS.md](MONGO-OPS.md) |
| S2 | Shilpi wire + portal drawing packages | esti · portals | ✅ [SHILPI-WIRE.md](SHILPI-WIRE.md) |
| S3 | AQC three-app packaging | AQC | ✅ Estimation · BBS · PM shells |
| S4 | Manager Tasks module | AStudio · AConsulting | ✅ local tasks + publish ops |
| S5 | Online ops DB manager | esti | ✅ `/ops-db` |
| S6 | Soft-launch marketing | esti | ✅ Landing · blog · SEO · marketing-only gate · VPS bootstrap |
| S7 | Soft-launch ops + agent law | esti | ✅ [PRODUCTION-OPS](PRODUCTION-OPS.md) § Soft launch · CLAUDE/AGENTS · this roadmap |
| **S8** | Reopen apex auth / portal demos | esti | 🔲 prep ✅ · env flip 🔲 |
| **S9** | Per-app installer packaging (MSIX) | AQC-* repos | 🟡 WinUI shells + AQC pin ✅ · MSIX/sign 🔲 |
| **S10** | Firm portal depth | esti portals | 🟡 contractor Project ✅ · site/collab depth 🔲 |

---

## D-waves (desktop baseline)

| Wave | Outcome | Status |
| --- | --- | --- |
| **D0–D5** | Bridge · siblings · WinUI shells · portal panels | ✅ |
| **D6** | Signed installers · portal tenants | 🔲 (pairs with S8/S9) |

---

## Product map

| App / surface | Role | Repo |
| --- | --- | --- |
| **AStudio** / **AConsulting** | Practice managers | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) |
| **AQC Estimation / BBS / PM** | Three technical installers · shared engine | [AQC](https://github.com/HolagundiWorks/AQC) SoT · [AQC-Estimation](https://github.com/HolagundiWorks/AQC-Estimation) · [AQC-BBS](https://github.com/HolagundiWorks/AQC-BBS) · [AQC-PM](https://github.com/HolagundiWorks/AQC-PM) |
| **AADT** · **ShilpiDB** | Drafting · geometry | [AADT](https://github.com/HolagundiWorks/AADT) · [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **aorms** (esti) | Hub · marketing · portals · Mongo ops | [aorms](https://github.com/HolagundiWorks/aorms) |

## Next up (execute in order)

### S8 — Reopen apex auth (when demos are honest)

**Prep (in progress · 2026-08-08):**

| Slice | Status |
| --- | --- |
| Hide unused firm-portal chrome tabs (`visibleFirmPortalSections`) | ✅ |
| Collab: drop empty Progress tab until issued-progress API | ✅ |
| Installers Coming soon independent of auth gate (`VITE_INSTALLERS_COMING_SOON`) | ✅ |
| Env flip `VITE_MARKETING_ONLY=false` on VPS | 🔲 when ready to reopen |

Do **not** flip until portal tabs show real or empty-honest UI (no broken demos).

1. Set `VITE_MARKETING_ONLY=false` in VPS `/opt/esti/.env` (and bake via `Dockerfile.prod` rebuild).
2. `bash deploy/update.sh` (or re-run landing install with gate off).
3. Smoke: `/login` shows unified tabs · portal roles land on honest chrome.
4. Keep `/downloads` Coming soon **until D6** — default `VITE_INSTALLERS_COMING_SOON` (gate off ≠ installers live).
5. Mark this row ✅ in the Suite waves table.

### S9 progress (2026-08-08)

| Slice | Status |
| --- | --- |
| Distinct `ApplicationId` | ✅ `in.aorms.aqc.{estimation,bbs,pm}` |
| `vendor/AQC` submodule (not gitignored) | ✅ |
| Unpackaged WinUI + Activate/Flush bridge host | ✅ builds Release\|x64 |
| Domain UI · Package.appxmanifest · code sign | 🔲 (D6) |

### S10 progress

| Slice | Status |
| --- | --- |
| Hide unused chrome tabs | ✅ (S8 prep) |
| Contractor `projectDetail` + Project panel | ✅ |
| Collab progress/docs · site panels | 🔲 |

### Then

1. **S8 flip** when ready — `VITE_MARKETING_ONLY=false` on VPS.  
2. **S9** — MSIX manifests per app (still unsigned until D6).  
3. **D6** — Code-signed URLs + sha256 + `VITE_PORTAL_USE_RELEASE_INSTALLERS`.  
4. **S10** — Site portal panels · collab issued-progress.

## Deferred

SaaS SKUs · Stripe · dual Postgres/Mongo forever · full WinUI domain split from BBSApp · wiki restore on apex.
