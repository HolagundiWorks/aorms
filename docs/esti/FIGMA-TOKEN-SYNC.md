# LF6 — Figma ↔ `@hcw/ui-kit` token sync

**Status:** Stub shipped · DesignOps ritual ongoing · **Updated:** 2026-08-06  
**Kit bridge (canonical):** [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md)  
**Scope split:** [13-ROADMAPS.md](../hcw-kit/13-ROADMAPS.md) · **UX law:** [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)

Closes the **documentation + automation stub** half of LF6. The Figma
**component** library remains DesignOps-owned (not a kit defect).

## Source of truth

| Layer | Authority |
| --- | --- |
| Code tokens | `vendor/hcw-ui-kit` ← upstream [hcwux](https://github.com/HolagundiWorks/hcwux) `src/tokens.ts` |
| Export artefacts | `vendor/hcw-ui-kit/dist/tokens.json` · `tokens.css` |
| Figma Variables | Import of `tokens.json` via Tokens Studio (or DTCG importer) |
| Product chrome | `@hcw/ui-kit` only — desktop and web share one language |

Never hand-edit `dist/`. Re-vendor per [KITS.md](../KITS.md) after upstream token changes.

## DesignOps ritual

1. Pull / re-vendor kit when tokens change.  
2. Confirm export exists: `pnpm --filter @hcw/ui-kit export-tokens` (or full kit build).  
3. Run monorepo stub: `node scripts/figma-token-sync-check.mjs` (CI-friendly).  
4. Import `vendor/hcw-ui-kit/dist/tokens.json` into the team Figma Variables file.  
5. Map collections per [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md) (colour schemes · size · typography).  
6. Smoke the same route on desktop loopback flags and web ([DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) PR checklist).

## What this stub does / does not

| Does | Does not |
| --- | --- |
| Verify vendored `tokens.json` is present + parseable | Push tokens into Figma automatically (no Figma API key in-repo) |
| Print kit version + colour-mode keys for operators | Maintain a Figma component library |
| Document the sync direction (code → Figma) | Redesign marketing heroes |

## LF6 remainder

| Piece | Status |
| --- | --- |
| UX parity checklist (doc) | ✅ [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) |
| Figma ↔ kit token sync notes + check script | ✅ this file + `scripts/figma-token-sync-check.mjs` |
| Inspector / Ask ESTI **right-slot** (one slot both hosts) | 🔲 product polish — follow parity checklist; no second AI chrome |

## Related

- [ROADMAP.md](ROADMAP.md) § Local-first LF6 (status: Vishwakarma)  
- [WEB-PORTAL.md](WEB-PORTAL.md) · [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
- [HCW-UI-KIT.md](HCW-UI-KIT.md) · kit [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md)  

