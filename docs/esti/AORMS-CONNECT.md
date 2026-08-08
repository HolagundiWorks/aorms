# AORMS Connect

**Status:** Canonical product law · **Updated:** 2026-08-08  
**Package id:** `in.aorms.connect` · **Repo:** [AORMS-Connect](https://github.com/HolagundiWorks/AORMS-Connect)  
**Suite:** [AORMS-SUITE.md](AORMS-SUITE.md) · **Runtime:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **Roadmap:** [ROADMAP.md](ROADMAP.md) C0–C3

**AORMS Connect** is the **suite core desktop app** — single login, launcher,
shared firm/project catalog, DB connector, and installer links for every suite
app. It is **not** a practice manager and **not** a rename of AStudio.

| Owns | Does **not** own |
| --- | --- |
| Firm **login / session** (SSO for the suite) | AStudio / AConsulting practice UI |
| **Launcher** for installed suite apps | Technical calc (BOQ / BBS / programme) |
| **Online installer links** (from hub `/update-manifests`) | Drawing entities (ShilpiDB) |
| **Shared firm catalog** — projects + identity across apps | Money calc · CAD |
| **DB connector** — local firm store + hub / Mongo bind | Full Licence Manager UI (**C3 future**; stub only) |
| Licence **status** stub | Staff ERP on `aorms.in` apex |

```mermaid
flowchart TB
  subgraph connect [AORMS_Connect]
    Login[Login_session]
    Launch[App_launcher]
    Catalog[Shared_project_catalog]
    DbConn[DB_connector]
    Install[Installer_links]
  end
  subgraph apps [Suite_apps]
    AS[AStudio]
    AC[AConsulting]
    EST[AQC_Estimation]
    BBS[AQC_BBS]
    PM[AQC_PM]
    AAD[AADT]
  end
  Hub[aorms_hub_APIs]
  Login --> Hub
  DbConn --> Hub
  Login --> Launch
  Catalog --> apps
  Launch --> apps
  Install --> Hub
```

---

## Session model (SSO)

1. User signs in **only in Connect** (hub auth).  
2. Connect persists session + `syncToken` (or successor) under  
   `%LocalAppData%\AORMS-Connect\` (shared firm store: `firm.db` via Bridge).  
3. Suite apps launch from Connect with Connect-issued credentials — **no per-app login**.  
4. **C2:** shared auth file or localhost session broker so sibling processes read the same session. Until C2 ships, Connect Activate writes Bridge auth; sibling apps may still Activate for smoke — product UX target remains Connect-only login.

### C2 session / catalog contract (implement next)

| Artifact | Path / API | Writer | Readers |
| --- | --- | --- | --- |
| Bridge firm DB | `%LocalAppData%\AORMS-Connect\firm.db` | Connect Activate / Flush | Connect |
| Session export (C2) | `%LocalAppData%\AORMS-Connect\session.json` (planned) | Connect on login | Suite apps at launch |
| Project catalog | `%LocalAppData%\AORMS-Connect\catalog.json` | Connect UI (C1) | Suite apps (C2) |
| Hub | `ESTI_HUB_URL` · activate · ops | Connect | Apps via shared `syncToken` |

**Rules for C2:**

- Connect is the **only** desktop surface that runs full user login against the hub.  
- On successful login/activate, write `session.json` with `{ syncToken, hubUrl, userId, expiresAt }` (shape TBD in Bridge).  
- Sibling apps, when launched from Connect, receive `--connect-session` path or read the default `session.json` — **do not** prompt for HLP key if a valid session exists.  
- `catalog.json` entries use stable UUID `id` + firm `ref` + `title` + `status`; apps must not invent parallel project ids for the same engagement.  
- Soft-launch marketing gate (`VITE_MARKETING_ONLY`) is **unrelated** — do not flip apex login as part of Connect work.

## Project catalog (consistency)

Connect owns the **canonical project register** (id, ref, title, status).  
C1 writes `catalog.json` locally. Estimation / BBS / PM / managers / AADT will
resolve projects from that catalog in **C2** so details stay consistent. Apps may
append published meta via Bridge; they do not fork divergent project identities.

## Launcher + installers

| Action | Behaviour |
| --- | --- |
| Detect install | Known package ids / install paths per suite app |
| Open | Launch installed WinUI / MSIX app |
| Get installer | Open online link from hub manifests (`/update-manifests/*.json`) — Coming soon until D6 signed URLs |

Connect itself is listed on `/downloads` (`aorms-connect` offer) — Coming soon until D6.

## DB connector

- Local SQLite / firm catalog beside session store.  
- Hub bind for Mongo ops metadata (same Bridge lineage as AQC apps).  
- Ops browse depth may deepen later; Connect is the desktop entry for firm DB bind, not a second `/ops-db` mega-UI on day one.

## Licence Manager (C3 — future)

Stub surface in Connect (“Coming soon”). Full parity with `admin.aorms.in` is
deferred. Do not invent Stripe / Standard licence metering in Connect copy.

---

## Delivery waves

| Wave | Outcome |
| --- | --- |
| **C0** | This canon + nomenclature + downloads stub |
| **C1** | WinUI shell: login · launcher · installer links · projects list · licence stub |
| **C2** | Session broker + catalog API for sibling apps |
| **C3** | Licence Manager surface |

See [ROADMAP.md](ROADMAP.md).

## Rejects

- Mega-app that absorbs AStudio + Estimation + CAD  
- Per-app login as the primary suite UX  
- Staff ERP login on apex marketing site instead of Connect  
- Divergent firm.db per app with no Connect catalog (long-term)  
- Claiming signed Connect Setup.exe before D6  
