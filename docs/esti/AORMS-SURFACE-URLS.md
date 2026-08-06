# AORMS surface URLs (frozen)

**Status:** Canonical · **Frozen:** 2026-07-11 · **Revised:** 2026-07-25 · **Owner:** HCW

Executable constants: `frontend/src/lib/aorms-surface-urls.ts` and
`frontend/src/lib/product-nomenclature.ts`.

**Four subdomains** remain for product surfaces (plus apex). Everything else is a
**path on aorms.in**.

---

## Subdomains (hosts)

| Host | Surface | Audience | Role |
| --- | --- | --- | --- |
| **[aorms.in](https://aorms.in)** | Platform | Public + authenticated pages | Marketing, wiki, blog, auth, account, external portals |
| **[studio.aorms.in](https://studio.aorms.in)** | **AStudio** | Firm staff | Architecture consultancy workspace |
| **[consultancy.aorms.in](https://consultancy.aorms.in)** | **AConsulting** | Public / prospects + firm staff | Engineering consultancy marketing + product entry |
| **[proc.aorms.in](https://proc.aorms.in)** | **AProc** | Public / prospects + firm staff | PMC marketing + product entry (preview); alias host `pmc.aorms.in` |
| **[admin.aorms.in](https://admin.aorms.in)** | Licensing console | HCW operators | Platform administration |

---

## Platform pages (aorms.in paths)

Same SPA bundle; no dedicated host.

| Path | Surface | Notes |
| --- | --- | --- |
| `/` | Platform landing | Hero, frameworks, conversion dock |
| `/login` | AStudio sign-in | Architecture marketing + workspace login |
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

---

## Legacy subdomain redirects

Retired hosts **301 → aorms.in** (nginx + client-side fallback in `App.tsx`):

| Legacy host | Redirect |
| --- | --- |
| `wiki.aorms.in` | `https://aorms.in/wiki` (+ path preserved) |
| `kbank.aorms.in` | `https://aorms.in/libraries/knowledge-bank-portal` |
| `external.aorms.in` | `https://aorms.in/access` |
| `account.aorms.in` | `https://aorms.in/account` |
| `app.aorms.in` | **301 → `https://studio.aorms.in`** |
| `www.aorms.in` | **301 → `https://aorms.in`** |

`pmc.aorms.in` is an **alias** of `proc.aorms.in` (same SPA surface), not a redirect target.

---

## Deploy checklist

1. **DNS** — A records for `aorms.in`, `studio`, `consultancy`, `proc` (optional `pmc`), `admin`.
2. **TLS** — certbot SAN cert (see `deploy/nginx-proxy.conf` · `deploy/install-surface-tls.sh`).
3. **ALLOWED_ORIGINS** — `https://aorms.in`, `https://studio.aorms.in`, `https://consultancy.aorms.in`, `https://proc.aorms.in`, `https://admin.aorms.in` (`AORMS_ALLOWED_ORIGINS` in code; add `https://pmc.aorms.in` if that alias is live).
4. **VITE_ADMIN_URL** — `https://admin.aorms.in` for production frontend builds.
5. **Single SPA dist** — apex + studio + consultancy + proc serve the same `frontend/dist`; routing is host-aware in `App.tsx`. Admin console is a separate deployment.

Local dev: use path aliases on `localhost:5173` (`/pmc`, `/consultancy`); optional `/etc/hosts` for subdomain testing.

---

## Related

- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)
- [KNOWLEDGE-BANK-PORTAL.md](KNOWLEDGE-BANK-PORTAL.md)
