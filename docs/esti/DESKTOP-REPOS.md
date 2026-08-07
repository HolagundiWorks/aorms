# Desktop sibling repos + portal installer wiring

**Status:** Canonical · **Updated:** 2026-08-07 (desktop-native pivot)  
**Product law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · Bridge: [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md)

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Three desktop apps** | [AQC](https://github.com/HolagundiWorks/AQC) · `AStudio` · `AConsulting` |
| **Stack** | C# WinUI 3 + C++ `bbs_engine` (fork AQC) |
| **Contracts** | `@esti/contracts` + [HUB-API.md](HUB-API.md) / [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) |
| **esti `desktop/`** | Historical WebView2 node — reference only |
| **Open source** | Keep OSS for now; SaaS commercial licensing deferred |

## Repos

| Repo | Role |
| --- | --- |
| `HolagundiWorks/AQC` | AProc / quantity-costing — engine source + bridge spike |
| `HolagundiWorks/AStudio` | Architecture practice OS |
| `HolagundiWorks/AConsulting` | Engineering practice OS |
| `HolagundiWorks/esti` (this) | Hub · portals · marketing · contracts · reference SPA |

Agent-ready scaffolds: [repo-scaffolds/](repo-scaffolds/).

## Fork policy

1. Tag AQC baseline (BBS + estimate proven).  
2. Share `bbs_engine` + `Aorms.Bridge` (submodule or package).  
3. Specialize UI/domain per app — **do not** fork divergent engines.

## Portal → installer wiring

Signed Setup.exe from each sibling repo → `aorms.in/downloads` manifests
([WEB-PORTAL.md](WEB-PORTAL.md)). Keep `web_fallback` until SmartScreen-trusted.

## Related

- [AQC-BRIDGE-SPIKE.md](AQC-BRIDGE-SPIKE.md) · [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)  
- [ROADMAP.md](ROADMAP.md) § D-waves  
