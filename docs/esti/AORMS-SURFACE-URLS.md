# AORMS surface URLs (frozen)

**Status:** Canonical · **Revised:** 2026-08-07 (desktop-native pivot) · **Owner:** HCW

Executable constants: `frontend/src/lib/aorms-surface-urls.ts` and
`frontend/src/lib/product-nomenclature.ts`.

**Product law:** `aorms.in` = **marketing + demos only**. Staff ERP runs on
**desktop** (AStudio / AConsulting / AQC). Firm clients use **firm-branded portals**.
License control plane stays on **admin.aorms.in**.

---

## Subdomains (hosts)

| Host | Surface | Audience | Role |
| --- | --- | --- | --- |
| **[aorms.in](https://aorms.in)** | Platform marketing | Public | Landing, wiki, blog, demos, downloads — **no firm ERP logins** |
| **[studio.aorms.in](https://studio.aorms.in)** | **AStudio** marketing | Prospects | Product story + desktop download CTA (staff app is desktop) |
| **[consultancy.aorms.in](https://consultancy.aorms.in)** | **AConsulting** marketing | Prospects | Product story + desktop download CTA |
| **[proc.aorms.in](https://proc.aorms.in)** | **AQC / AProc** marketing | Prospects | PMC / quantity-costing story + download CTA; alias `pmc.aorms.in` |
| **[admin.aorms.in](https://admin.aorms.in)** | Licensing console | HCW operators | Platform administration |
| **`{firm}.portal.aorms.in`** or customer domain | Firm portal | Clients / consultants / contractors / site | Updates · progress · drawings · finals |

---

## Platform pages (aorms.in paths)

| Path | Surface | Notes |
| --- | --- | --- |
| `/` | Platform landing | Marketing + demos; CTAs → downloads / product hosts |
| `/wiki`, `/wiki/*` | AORMS Wiki | Public documentation |
| `/blog`, `/blog/*` | Blog | Editorial |
| `/downloads` | Desktop installers | Local-first signed Setup.exe (web_fallback until signed); legacy `/download` redirects here — [WEB-PORTAL.md](WEB-PORTAL.md) |
| `/access` | External portals | Client, consultant, contractor, site sign-in |
| `/account` | Personal account | Identity + licence hub |
| `/company-account` | Company account | Firm owners |
| `/libraries/knowledge-bank-portal` | Knowledge Bank portal | Staff L4+, EOMS intake |
| `/aconsulting` | AConsulting marketing | Path alias; canonical host `consultancy.aorms.in` |
| `/aorms-consultancy` | Legacy | Redirects to `/#consultancy` |
| `/aproc` | AProc marketing | Path alias; canonical host `proc.aorms.in` |
| `/aorms-pmc` | Legacy | Redirects to `/#pmc` |
| `/about`, `/legal`, `/investors`, SEO landings | Marketing | Public pages |
| `/aconsulting` · `/aproc` | Marketing aliases | Canonical hosts above |
| `/login` | **Demo / legacy only** | Not the firm ERP entry. Firm portal login lives on the **firm portal host**. Operator licensing → `admin.aorms.in` |
| `/access` | Legacy | Prefer firm portal host; keep redirect for old links |
| `/account` · `/company-account` | Licence / account (transitional) | Prefer License Manager / firm onboarding; not marketing chrome |
| `/platform-admin` | Licensing console | Prefer `admin.aorms.in` |
| `/libraries/knowledge-bank-portal` | Knowledge Bank | EOMS intake (separate product surface) |

**Retired as product:** browser staff workspace on `studio.aorms.in` /
`consultancy.aorms.in` (SPA kept in-repo as **reference** only).

---

## Firm portal (product web)

| Concern | Law |
| --- | --- |
| Data source | Hub published `esti_sync_record` + meta only — [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) |
| IA | Home (updates) · Project · Progress · Drawings · Documents / numbers |
| Writes | Thin only — approval respond, bid, visit confirm |
| Chrome | Soft neu firm shell — floating `FirmPortalFooter` (60px · `PORTAL_CHROME`) · CLIENT + CONTRACTOR ActionDock · no staff ribbon |

---

## Legacy subdomain redirects

| Legacy host | Redirect |
| --- | --- |
| `wiki.aorms.in` | `https://aorms.in/wiki` |
| `kbank.aorms.in` | `https://aorms.in/libraries/knowledge-bank-portal` |
| `external.aorms.in` | Firm portal host when live; interim `/login?tab=portals` |
| `account.aorms.in` | `https://aorms.in/account` (transitional) |
| `app.aorms.in` | **301 → `https://studio.aorms.in`** (marketing) |
| `www.aorms.in` | **301 → `https://aorms.in`** |

---

## Deploy checklist

1. **DNS** — `aorms.in`, `studio`, `consultancy`, `proc` (optional `pmc`), `admin`, portal wildcard when ready.
2. **TLS** — certbot SAN / wildcard for portals.
3. **ALLOWED_ORIGINS** — marketing hosts + `admin` + firm portal origins.
4. **VITE_ADMIN_URL** — `https://admin.aorms.in`.
5. Desktop installers published from sibling repos (AQC / AStudio / AConsulting).

---

## Related

- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md)  
- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) · [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md)  
