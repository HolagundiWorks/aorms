# AORMS agent workstreams (crew)

**Status:** Canonical coordination · **Updated:** 2026-08-06  
**Companion:** [ROADMAP.md](ROADMAP.md) § Local-first · [LOCAL-FIRST.md](LOCAL-FIRST.md)

| Name | Role | Lane |
| --- | --- | --- |
| **Vishwakarma** | CTO / orchestrator | Merges to `main`; resolves cross-lane conflicts |
| **Bhoomi** | Local desktop LF4 | Tauri packaging, code signing, morning bind smoke |
| **Gagan** | Cloud hub / sync | Hub APIs, `syncToken`, contracts export, LF3 meta |
| **Aakash** | Cloud portal / GTM / UX | `/downloads`, manifests, M8 copy, LF6 Figma tokens |

Hard shared outs: no Stripe/W4; do not edit `Projects.tsx` / `Clients.tsx`.

---

## Bhoomi — Local · Packaging / signing

| # | Item | Status |
| --- | --- | --- |
| B1 | Signed Tauri Setup.exe (AStudio / AConsulting) | 🔲 |
| B2 | Publish URL + sha256 for portal fill | 🔲 |
| B3 | Morning bind test (licence → hub) | 🔲 — see [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) |

**Aakash** must **not** wire unsigned overnight binaries into `/downloads`. Wait on Bhoomi for signed URL + sha256 before flipping live CTAs.

---

## Gagan — Cloud · Hub / sync / contracts

| # | Item | Status |
| --- | --- | --- |
| G1 | Activate/refresh → hub sync bearer (`HUB-API.md`) | 🔲 (Gagan owns) |
| G2 | Harden `sync.*` for `ESTI_ROLE=node` | 🔲 (Gagan owns) |
| G3 | `@esti/contracts` consumer note / DESKTOP-REPOS gate | 🔲 (Gagan owns) |
| G4 | LF3 domain meta enqueue/apply spot-check | 🔲 (Gagan owns) |

---

## Aakash — Cloud · Portal / GTM / UX parity

| # | Item | Status |
| --- | --- | --- |
| A1 | `/downloads` portal + `update-manifests/{astudio,aconsulting}.json` placeholders | ✅ 2026-08-06 |
| A2 | Env one-line fill (`VITE_ASTUDIO_INSTALLER_URL` / `VITE_ACONSULTING_INSTALLER_URL` / `VITE_PORTAL_USE_RELEASE_INSTALLERS`) | ✅ prep · **live URL** 🔲 until Bhoomi signs |
| A3 | LF6 Figma ↔ `@hcw/ui-kit` token sync notes + automation stub | ✅ stub · DesignOps import ritual ongoing |
| A4 | M8 GTM scrub (no “web-only / no desktop” on public surfaces); honest `web_fallback` CTAs | ✅ 2026-08-06 |
| A5 | Empty sibling repo scaffolds (`docs/esti/repo-scaffolds/`) — README only | ✅ scaffolds · GitHub create optional/human |
| A6 | Align WEB-PORTAL / MARKET-FIT M8 / ROADMAP / this file with reality | ✅ |

### Aakash acceptance notes

- Download URL checklist items stay **🔲** until Bhoomi publishes a signed URL.  
- Inspector/AI right-slot (LF6 remainder) tracks under UX parity polish — not blocked on portal prep.  
- Do not extract SPA app code into sibling repos in this wave.  
- Do not mint hub `syncToken` or change sync backend (Gagan).  
- Do not build/sign Setup.exe (Bhoomi).  
- Open PRs for **Vishwakarma** to merge.

---

## Change rule

When a checkbox flips, update this file and [ROADMAP.md](ROADMAP.md) in the same PR. Vishwakarma merges.
