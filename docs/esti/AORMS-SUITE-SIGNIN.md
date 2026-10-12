# AORMS suite sign-in — one login for the portal, AAD and AQC

**Status (2026-10-11):** server side built and live-verified against a local dev server (migrations `0111`, `0112`, new routes). The desktop clients are not built yet except AQC's `Aorms.Connect` library; nothing in the Windows apps uses this yet.

**Decision (owner, 2026-10-11):** three products — the AORMS web portal, **AAD** (desktop 2D CAD, repo `HolagundiWorks/AADT`) and **AQC** (desktop take-off/estimation, repo `HolagundiWorks/AQC`) — are bundled by **one AORMS login**, not by one installer. The apps stay separate downloads; each works free and standalone (Community) when signed out. Signed in to a connected studio (Studio plan or higher, not expired) each pulls the project's data from the portal. **The AORMS login is the licence** — no keys, as for AQC.

This supersedes the "no per-app logins" rule in `CLAUDE.md` (see its reworded Agent do / don't table). What stays: web-only office hub, no AORMS-shipped installers, no licence manager.

## One sign-in, one session per app

* **Tokens are shared; sessions are not.** The access/refresh token is the user's AORMS (Supabase) sign-in. Each desktop app starts **its own session** with `POST /api/aqc/v1/session` `{ clientLabel, app }`, `app` = `"aqc"` (default) or `"aad"`.
* **One active session per user per app (D8, refined).** A second sign-in of the *same* app replaces that app's session (the first sees `409 session_replaced`). AAD and AQC run side by side without affecting each other. Table `aqc_sessions` is keyed `(account_id, client_app)` (migration `0111`); `aqc_start_session(text)` still works and means `aqc`.
* Every later call sends `Authorization: Bearer <accessToken>` and `x-aqc-session: <sessionId of that app>`.
* The contract version stays `2026-10-aqc-1`: `app`, the `cad_bridge` kind and the new routes are additive. The `aqc` in route/table/header names is a historical name, not a statement that the endpoints are AQC-only; renaming is cosmetic and deferred.

## Shared token store (desktop)

One OS credential holds the sign-in for every suite app on a machine:

| | |
|---|---|
| Windows | Credential Manager generic credential, target `AORMS/Connect`, user name = email |
| macOS / Linux (AAD only) | the same target/service name in the system keychain (`keyring`) — AQC is Windows-only, so nothing is shared there |
| Blob (UTF-8 JSON) | `{ "v": 1, "refreshToken": "…", "email": "…", "updatedAt": <Unix seconds, integer> }` |
| Never stored | the access token, the password, the per-app `sessionId` (each app keeps its own in a per-app entry, e.g. `AORMS/Connect/aqc`, `AORMS/Connect/aad`) |

**Refresh-token rotation.** Supabase refresh tokens rotate: each use returns a new one and invalidates the old (after a short reuse window). Two apps refreshing from the same stored token can therefore break each other. Rule for every app:

1. Immediately **before** refreshing, re-read the shared credential (another app may have rotated it).
2. Refresh with the token just read. Immediately **after**, write the new token back (`updatedAt` = now).
3. If the refresh is refused (`invalid_grant`): re-read once; if the stored token differs, retry once with it; otherwise the sign-in has ended → sign out, **keep unsent work**, and ask the user to sign in again.
4. A busy or failing auth server (5xx/429) never signs anyone out.

Signing out in one app clears the shared credential (the other app finds it empty on its next refresh and asks to sign in). **Not yet proven on Windows:** two apps refreshing within seconds of each other. That is the first check once both apps use the store.

## What each app pulls and pushes

| Data | Direction | Mechanism |
|---|---|---|
| Project list, title block, parties, letterhead, client, awarded contractor | portal → AAD, AQC | `GET /projects`, `GET /seed/{projectOfficeId}` |
| Levels / floors / beam depths / project settings | portal ⇄ AAD, AQC | project `settings` JSON on the project's binding (`GET /projects/{id}/rows?since=0` returns it; `PUT /projects/{id}/settings`) |
| Drawings (DXF/PDF) | portal → AAD | `GET /files/drawing/{id}` signed URL |
| Drawings | AAD → portal | **`POST /drawings`** (multipart: `projectOfficeId`, `title`, `file`, optional `rootId`, `revisionNote`). Same rules as the web upload: DXF or PDF only, 25 MB, **DWG refused** (export DXF), revision chaining, SVG job. Idempotent: the same file already current → `200 { unchanged: true }`. Needs `write`. |
| CAD take-off | AAD → portal → AQC | version kind **`cad_bridge`** (the `hcw-aqc-bridge` v1 JSON, contract in AQC `docs/bridge/`): `POST /projects/{id}/files` (`application/json`) → PUT → `POST /projects/{id}/versions { kind:"cad_bridge", contentHash, summary, storageKey }`. AQC lists `GET /projects/{id}/versions?kind=cad_bridge`, downloads `GET /files/version/{versionId}`, and feeds its unchanged importer (idempotent by `source`/`source_ref`, preview, one undo). Needs `write`; never client- or contractor-visible. The local `<drawing>.aqcbridge.json` stays as the offline/Community path. |
| Drawing revision log | portal → AAD | `GET /drawings/{id}/revisions` (any revision id; newest first: rev, note, current, size, review status, date). |
| Drawing tasks + programme | portal ⇄ AAD | `GET /tasks?projectOfficeId=…[&drawingId=…]` (tasks, optionally those tied to that drawing's chain via `tasks.drawing_id`, plus milestones); `PATCH /tasks/{id}` `{status}` — status only (TODO / IN_PROGRESS / BLOCKED / DONE), needs `write`, audited. |
| Drawing notes (annotations) | AAD ⇄ portal, studio team only | `GET`/`POST /drawings/{id}/notes` (`{body,x,y}`, keyed by the chain root so a note stays with the drawing across revisions), `PATCH /notes/{id}` (`{body?,status?}`: resolve / reopen by anyone with `write`; text edit by the author, owner or partner). Notes are resolved, never deleted. Not visible to client / contractor / collaborator portals. Migration `0113`. |
| Estimates, BOQ, BBS, rate books, contractor bills | AQC ⇄ portal | unchanged (`docs/esti/AQC-CLIENT-SPEC.md`) |

A CAD app can bind a project too (`POST /projects`, same as AQC). The binding is one per AORMS project and is shared by AAD and AQC.

**Conflict rule (both apps):** portal data reaches a drawing/take-off only on an explicit *Pull project info* (AAD) or the AQC import preview; nothing overwrites drawn geometry; both apps keep working offline.

## Licence

Enforced by the server for every call (`lib/aqc/entitlement.ts`): Studio / Professional / Enterprise, not expired. FREE, expired or unlinked studios get `403 not_connected` with a reason; the app shows it and continues in Community mode. AAD is open source (MIT OR Apache-2.0), so a client-side check could be removed — the server check is the licence.

## Build state

| Piece | State |
|---|---|
| Migrations `0111` (sessions per app), `0112` (`cad_bridge` kind) | applied to the live `aorms-web` project 2026-10-11 |
| `/session` `app`, `POST /drawings`, `GET /files/version/{id}`, `GET …/versions?kind=` | built; tested locally (167 vitest; scripted live run: session isolation, kind permissions, DWG/non-drawing refusal, VIEWER 403). **Not exercised:** the actual storage upload (the local server has placeholder storage keys) — verify on the deployed site |
| AQC `Aorms.Connect` | A1–A7 done; sends `app`, shared-store rotation rule, `CadBridgeApi` (AQC repo branch `claude/aqc-suite-signin`, 80 tests). **Not yet written:** the Windows Credential Manager store and the app wiring |
| AAD (AADT repo) | crate `cadcraft-aorms` + commands `aorms.signin/restore/signout/status/projects/open/pull/drawings` (branch `claude/aorms-connect`: 25 + 12 tests, live smoke against a local server: signed in as `aad`, pulled a project's details and floors). **Not built:** UI, drawing push, take-off push (`aqcexport` writer is its last unbuilt port item) |
| Windows verification | none yet |
