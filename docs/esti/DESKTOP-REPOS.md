# Desktop sibling repos + suite packaging

**Status:** Canonical · **Updated:** 2026-08-08 (AORMS Connect suite core)  
**Product law:** [AORMS-SUITE.md](AORMS-SUITE.md) · [AORMS-CONNECT.md](AORMS-CONNECT.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md)

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Single contracts package** | `@esti/contracts` in this monorepo — **do not** invent a second contracts repo |
| **Desktop shell in-tree** | `desktop/AStudio.Shell` (**WinUI 3** + WebView2) — the legacy Tauri scaffold was **removed; WinUI 3 is the only shell** |
| **Same SPA** | Desktop loads `frontend/` against loopback backend |

## Repos

| Repo | Role |
| --- | --- |
| `HolagundiWorks/AORMS-Connect` | Suite core — SSO · launcher · catalog · installer links |
| `HolagundiWorks/AQC` | Engine SoT (`bbs_engine`, `Aorms.Bridge`) + reference `BBSApp` |
| `HolagundiWorks/AQC-Estimation` | Estimation installer shell (publishes to portals) |
| `HolagundiWorks/AQC-BBS` | BBS installer shell |
| `HolagundiWorks/AQC-PM` | Project Management / AProc installer shell |
| `HolagundiWorks/AStudio` | Architecture practice manager |
| `HolagundiWorks/AConsulting` | Engineering practice manager |
| `HolagundiWorks/AADT` | ADraft — 2D drafting |
| `HolagundiWorks/shilpidb` | Geometry store + `shilpi-http` |
| `HolagundiWorks/aorms` (esti) | Hub · portals · marketing · Mongo ops · contracts |

## Packaging policy

1. Pin `bbs_engine` + `Aorms.Bridge` from **AQC** (submodule / tag) in technical apps + Connect.  
2. Distinct MSIX identities — Connect `in.aorms.connect`; AQC `in.aorms.aqc.*`.  
3. Managers do **not** absorb Estimation/BBS UI; Connect does **not** absorb practice UI.  
4. Drawings flow through ShilpiDB; ops through Mongo; **projects** via Connect catalog.  
5. Public download CTAs stay Coming soon / `web_fallback` until signed URL + sha256. Soft launch: [ROADMAP.md](ROADMAP.md) · D6.

## S9 exit (AQC product repos)

| Check | Done when | Status |
| --- | --- | --- |
| Distinct package identity | Estimation · BBS · PM each have `ApplicationId` | ✅ `in.aorms.aqc.{estimation,bbs,pm}` |
| Engine pin | Submodule → `HolagundiWorks/AQC` (Bridge; no fork) | ✅ |
| Unpackaged WinUI shell | Activate / Flush hub host per repo | ✅ |
| MSIX Package.appxmanifest | Per-app identity · `build-msix.cmd` | ✅ unsigned |
| Code-signed publish | Store / sideload URL + sha256 | 🔲 D6 |
| Manifest stubs | Matching `update-manifests/aqc-*.json` in aorms hub | ✅ prep |
| Honesty | No public Download CTA until D6 signed URL + sha256 | ✅ |

## C-wave exit (AORMS Connect)

| Check | Done when | Status |
| --- | --- | --- |
| Canon + nomenclature | [AORMS-CONNECT.md](AORMS-CONNECT.md) · `AORMS_CONNECT` | ✅ C0 |
| WinUI shell | Login · launcher · projects · licence stub | ✅ C1 scaffold |
| Session broker | Sibling apps consume Connect session | ✅ C2 |
| Licence surface | Local status · admin.aorms.in link | ✅ C3 |
| Signed installer | `update-manifests/aorms-connect.json` + sha256 | 🔲 D6 |

## D5b — Manager HCW geography (2026-08-09)

| Check | Done when | Status |
| --- | --- | --- |
| AStudio shell | Floating ribbon 56 · stage · ActionDock · taskbar 60 · clock 0.8× · wellness 320 | ✅ |
| AConsulting shell | Same geography + `HcwTheme` (practice nav labels) | ✅ / in sync |
| Canon docs | [DESKTOP-WINUI-UX.md](DESKTOP-WINUI-UX.md) · parity [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) | ✅ |
| Per-repo `WINUI-SHELL.md` | Managers + Connect + AQC thin shells documented | ✅ |
| Domain UI | Office · HR · engagements beyond bridge smoke | 🔲 |
| AQC / Connect chrome | Thin HCW ribbon + Fog stage + theme (full dock/clock optional) | ✅ thin |

## Related

- [DESKTOP-WINUI-UX.md](DESKTOP-WINUI-UX.md) · [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md)  
- [AORMS-SUITE.md](AORMS-SUITE.md) · [AORMS-CONNECT.md](AORMS-CONNECT.md) · [SHILPI-WIRE.md](SHILPI-WIRE.md) · [MONGO-OPS.md](MONGO-OPS.md)  
- [ROADMAP.md](ROADMAP.md) · [WEB-PORTAL.md](WEB-PORTAL.md) · [2026-08-09-UX-AUDIT-WAVE.md](../hcw-kit/11-audits/2026-08-09-UX-AUDIT-WAVE.md)  
