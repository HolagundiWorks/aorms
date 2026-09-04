# AORMS surface URLs (frozen)

**Status:** Canonical · **Revised:** 2026-09-04 (web-only office hub pivot) · **Owner:** HCW

Executable constants: `frontend/src/lib/aorms-surface-urls.ts` and
`frontend/src/lib/product-nomenclature.ts`.

**Product law:** `aorms.in` = **office hub + marketing, one surface**. All
staff sign in through the web SPA at `/login` — no desktop apps, no per-app
subdomains. Firm clients/consultants/contractors use **firm-branded portals**.
License control plane stays on **admin.aorms.in**.

---

## Surfaces (`AORMS_SURFACES`)

| Surface | Host | Audience | Role |
| --- | --- | --- | --- |
| **platform** | [aorms.in](https://aorms.in) (+ `www.aorms.in`) | Public + staff | Landing, blog, and the **office hub SPA** (`/login` sign-in) |
| **admin** | [admin.aorms.in](https://admin.aorms.in) | HCW operators | Licensing console (platform administration) |

Any hostname that doesn't match a known surface (or an `admin.*` prefix)
resolves to `unknown`, which `isPlatformHost()` treats as the platform surface
(fail-open to office hub, not a 404).

---

## Platform pages (`AORMS_PLATFORM_PAGES` — aorms.in paths)

| Path | Notes |
| --- | --- |
| `/` | Office hub landing — marketing + login CTA |
| `/blog`, `/blog/*` | Blog |
| `/downloads` | **Redirects to `/login`** — web-only, no installers |
| `/access` | External portals — client, consultant, contractor, site sign-in |
| `/account` | Personal account — identity + licence hub |
| `/company-account` | Company account (firm owners) |
| `/libraries/knowledge-bank-portal` | Knowledge Bank portal (staff L4+, EOMS intake) |
| `/login` | **AORMS office hub sign-in** — the one staff entry point |
| `/wiki`, `/wiki/*` | **Redirects home** — no public wiki surface |
| `/platform-admin` | Licensing console; prefer `admin.aorms.in` |

---

## Firm portal (product web)

| Concern | Law |
| --- | --- |
| IA | Home (updates) · Project · Progress · Drawings · Documents / numbers |
| Writes | Thin only — approval respond, bid, visit confirm |
| Chrome | Firm portal shell — CLIENT + CONTRACTOR chrome, no staff nav |

---

## Legacy subdomain redirects (`LEGACY_SUBDOMAIN_HOSTS`)

All resolve to the office hub apex; allied-app subdomains land on `/login`.

| Legacy host | Redirect |
| --- | --- |
| `external.aorms.in` | `/access` (root) or same path on apex |
| `account.aorms.in` | `/account` (root) or same path on apex |
| `studio.aorms.in` | `/login` — **AStudio removed** |
| `consultancy.aorms.in` | `/login` — **AConsulting removed** |
| `proc.aorms.in` | `/login` — **AProc removed** |
| `pmc.aorms.in` | `/login` — **AProc removed** |

---

## Deploy checklist

1. **DNS** — `aorms.in`, `admin`. (Allied-app subdomains above are legacy-only;
   keep them pointed at the same box so the redirect logic can serve them, or
   let them lapse.)
2. **TLS** — certbot SAN / wildcard as needed.
3. **ALLOWED_ORIGINS** — `AORMS_ALLOWED_ORIGINS_CSV` export covers the platform
   + admin hosts; see `frontend/src/lib/aorms-surface-urls.ts`.
4. **VITE_ADMIN_URL** — `https://admin.aorms.in`.

---

## Related

- [`../../CLAUDE.md`](../../CLAUDE.md) § Product naming
- [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md)
