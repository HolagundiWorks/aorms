# Desktop sibling repos + portal installer wiring

**Status:** Canonical gate notes · **Updated:** 2026-08-06  
**Product law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **Portal:** [WEB-PORTAL.md](WEB-PORTAL.md)  
**Agent split:** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)

Packaging lives in-monorepo (`desktop/`) until signed installers ship. Optional
empty GitHub shells for **AStudio** / **AConsulting** are README-only scaffolds —
**no SPA extraction** in this wave.

## Portal → installer wiring

```text
Bhoomi (Local)                    Aakash (Portal)
──────────────                    ───────────────
signed Setup.exe ──url+sha256──►  VITE_*_INSTALLER_URL
                                  or update-manifests/*.json
                                  + VITE_PORTAL_USE_RELEASE_INSTALLERS=true
                                           │
                                           ▼
                                  aorms.in/downloads  (web_fallback until then)
```

| Gate | Owner | Status |
| --- | --- | --- |
| Signed binary URL published | Bhoomi | 🔲 |
| Manifest / env filled on hub deploy | Aakash | 🔲 (prep ✅) |
| `@esti/contracts` usable by node clients | Gagan | 🔲 (Gagan owns — do not invent a second contracts repo) |
| Empty `AStudio` / `AConsulting` GitHub shells | Optional · human | 🔲 — READMEs in [repo-scaffolds/](repo-scaffolds/) |

## Monorepo packaging (current)

| Path | Role |
| --- | --- |
| `desktop/` | Tauri stub + env + start scripts |
| `frontend/` | Same SPA loaded by desktop shell and web |
| `packages/contracts` | Shared sync / capability types for node + hub |

## Sibling repo policy

1. Scaffolds under `docs/esti/repo-scaffolds/{AStudio,AConsulting}/README.md` only.  
2. Do **not** move app code until DESKTOP-REPOS gate + contracts consumer path are green.  
3. Creating empty GitHub repos is optional and requires write access outside read-only agent `gh`.

## Related

- [WEB-PORTAL.md](WEB-PORTAL.md)  
- [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)  
- [HUB-API.md](HUB-API.md) (Gagan)  
