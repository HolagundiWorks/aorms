# AORMS — UI site map (chrome by surface)

**Status:** Canonical inventory · **Updated:** 2026-08-07 · **Wave 1 consistency:** closed  
**Canon:** [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md)

One language everywhere: **no left rail · soft neu top bar · Fog Gray canvas · one clock · dock only where staff**.

```mermaid
flowchart TB
  subgraph marketing [Marketing]
    Landing["/ MarketingNeuFrame"]
    Blog["Blog Downloads 404 MarketingShell"]
  end
  subgraph auth [Auth]
    CardAuth["AuthRailLayout centered soft card"]
  end
  subgraph staff [Staff]
    Shell["AppRibbon soft bar + footer + ActionDock + AnalogueClock"]
    Pages["RailLayout stage pages"]
    Home["StudioAbstract Fog Gray"]
  end
  subgraph portals [Portals]
    Ext["ExternalPortalShell PortalNeuFrame"]
    Acct["PortalShell PortalNeuFrame"]
    Admin["AdminConsoleShell horizontal sections"]
  end
```

## Surface table

| Surface | Routes | Shell | Content width | Top bar | Bottom | Clock | Left rail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marketing | `/`, blog, downloads, 404 | `MarketingNeuFrame` / `MarketingShell` | 1200px | soft sticky | `MarketingLandingDock` | Pomodoro clock | No |
| Auth | `/login`, `/access`, signup, forgot/reset, force-pw, admin login | `AuthRailLayout` | ~420px card | none (card brand) | none | none | No |
| Staff | office, library, projects, … | `.esti-app-shell2` + `AppRibbon` + `RailLayout` | full + gutters | soft sticky neu bar | footer + ActionDock | AnalogueClock only | No |
| Studio home | `/` on studio | `StudioAbstract` | full | soft AppRibbon | footer + dock | AnalogueClock | No |
| External portals | client / consultant / contractor / site | `PortalNeuFrame` | 1200px | identity + Sign out | none | AnalogueClock | No |
| Account hubs | `/account`, `/company-account` | `PortalNeuFrame` | 1200px | hub nav + Sign out | none | AnalogueClock | No |
| Licensing admin | `/platform-admin` | `PortalShell` + horizontal sections | 1200px | portal top bar | none | AnalogueClock | No |

## Wave 1 closed (2026-08-07)

- Staff ribbon: soft sticky neu bar (float retired)
- Single AnalogueClock (footer tray digital clock removed)
- Studio home Fog Gray (white special-case removed)
- Auth: centered `AuthRailLayout` only (no marketing dock on sign-in)
- Admin console: horizontal section chips (left nav removed)

## Deferred (document only)

- AProc host / `PmcHome` rewire
- Delete unused `MarketingRailNav` / dead `.lp2-rail` CSS
- Knowledge Bank public vs staff path clarification
- Carbon spike isolation
