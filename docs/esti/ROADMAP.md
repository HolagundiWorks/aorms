# AORMS Implementation Roadmap

**Status:** ACTIVE (suite soft launch + Connect) · **Updated:** 2026-08-08  
**Canon:** [AORMS-SUITE.md](AORMS-SUITE.md) · [AORMS-CONNECT.md](AORMS-CONNECT.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md) ·  
[DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [WEB-PORTAL.md](WEB-PORTAL.md) · [VPS-INSTALL.md](VPS-INSTALL.md)

Open source for now; SaaS licensing deferred.

---

## Soft launch (aorms.in — now)

| Surface | State |
| --- | --- |
| `/` suite landing | ✅ Live |
| `/blog` (+ suite explainers) | ✅ Live |
| `/downloads` | ✅ Live — installers **Coming soon** (incl. Connect stub) |
| Apex `/login` · accounts | ⏸ Soft launch — **Coming soon** (`VITE_MARKETING_ONLY`) |
| Signed Windows installers | 🔲 D6 |
| Firm portal demos on apex | ⏸ After soft launch |

Gate: `VITE_MARKETING_ONLY` (default on for public builds) · `frontend/src/lib/marketing-gate.ts`.  
Desktop firm login target: **AORMS Connect** (not apex).

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
| S7 | Soft-launch ops + agent law | esti | ✅ [PRODUCTION-OPS](PRODUCTION-OPS.md) § Soft launch · CLAUDE/AGENTS |
| **C0** | AORMS Connect canon + nomenclature + downloads stub | esti | ✅ [AORMS-CONNECT.md](AORMS-CONNECT.md) |
| **C1** | Connect WinUI shell (login · launcher · catalog stub) | AORMS-Connect | ✅ shell scaffold · deepen C2 |
| **C2** | Session broker + project catalog for sibling apps | Connect · Bridge | ✅ `session.json` · `ConnectCatalog` · sibling import |
| **C3** | Licence Manager surface in Connect | Connect | ✅ local status · admin.aorms.in link |
| **S8** | Reopen apex auth / portal demos | esti | 🟡 code ready (gate-aware CTAs · `s8-reopen-demos.sh`) · VPS flip 🔲 |
| **S9** | Per-app installer packaging (MSIX) | AQC-* repos | 🟡 unsigned MSIX ✅ · code sign 🔲 D6 |
| **S10** | Firm portal depth | esti portals | ✅ collab tx+ack · Documents+RA · contractor/site Drawings · collab demo login |

---

## D-waves (desktop baseline)

| Wave | Outcome | Status |
| --- | --- | --- |
| **D0–D5** | Bridge · siblings · WinUI shells · portal panels | ✅ |
| **D6** | Signed installers · portal tenants | 🟡 tooling ✅ · blocked on SmartScreen-trusted cert + HTTPS |

---

## Product map

| App / surface | Role | Repo |
| --- | --- | --- |
| **AORMS Connect** | Suite core — SSO · launcher · catalog | [AORMS-Connect](https://github.com/HolagundiWorks/AORMS-Connect) |
| **AStudio** / **AConsulting** | Practice managers | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) |
| **AQC Estimation / BBS / PM** | Three technical installers · shared engine | [AQC](https://github.com/HolagundiWorks/AQC) SoT · [AQC-Estimation](https://github.com/HolagundiWorks/AQC-Estimation) · [AQC-BBS](https://github.com/HolagundiWorks/AQC-BBS) · [AQC-PM](https://github.com/HolagundiWorks/AQC-PM) |
| **AADT** · **ShilpiDB** | Drafting · geometry | [AADT](https://github.com/HolagundiWorks/AADT) · [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **aorms** (esti) | Hub · marketing · portals · Mongo ops | [aorms](https://github.com/HolagundiWorks/aorms) |

## Next up (execute in order)

### C-wave — AORMS Connect

| Slice | Status |
| --- | --- |
| C0 Canon · nomenclature · `aorms-connect` manifest stub | ✅ |
| C1 WinUI: Sign in · Suite apps · Projects · Licence stub | ✅ scaffold |
| C2 Shared session + catalog API for siblings | ✅ |
| C3 Licence Manager surface | ✅ |

### S8 — Reopen apex auth (when demos are honest)

| Slice | Status |
| --- | --- |
| Honest portal tabs · installers decoupled from auth gate | ✅ |
| Landing/dock CTAs + FAQ follow marketing gate | ✅ |
| `deploy/s8-reopen-demos.sh` (`CONFIRM=yes`) | ✅ |
| VPS env flip (`VITE_MARKETING_ONLY=false`) | 🔲 operator |

### Then

1. **S8 VPS flip** — `CONFIRM=yes bash deploy/s8-reopen-demos.sh` when ready to reopen `/login` demos (seed has client/contractor/collab portals).  
2. **D6** — Trusted Authenticode → upload → `apply-installer-manifest.ps1 -ConfirmFlip` → release flag + rebuild. Prefer Connect first.  
3. Hub-portal SyncEntity allow-list ✅ · AProc pmc RA stays live · portal tenants after D6.

## Deferred

SaaS SKUs · Stripe · dual Postgres/Mongo forever · full WinUI domain split from BBSApp · wiki restore on apex · merging AStudio into Connect.
