# AORMS — licensing & usage (2026-08)

> **Product law:** One **standard AORMS licence**. No trials, no tiers, no Community
> edition, no Lite/Pro/Enterprise split. You sign up, get an **ACTIVE** licence with
> the full workspace and **5 GB** cloud storage included. You pay for **extra storage**
> and **hosted AI usage** (or bring your own API key).
>
> **Local-first (2026-08):** AORMS ships as **desktop preferred** (offline authoring,
> local calc/AI) with **full web parity** on the cloud hub. See
> [LOCAL-FIRST.md](LOCAL-FIRST.md).
>
> Implementation queue: [ROADMAP.md](ROADMAP.md).

## One standard licence

| What you get | Detail |
|--------------|--------|
| **Licence** | `ACTIVE` — full **AStudio** workspace (desktop + web) |
| **Users** | Unlimited staff logins |
| **Clients / contractors / consultants / projects** | Unlimited |
| **Storage (cloud)** | **5 GB** published artifacts included; overage billed per GB-month |
| **AI** | Local Ollama on desktop; hosted ESTI metered on web, or BYO OpenAI-compatible key |
| **Desktop** | **First-class** — local-first node (`ESTI_ROLE=node`); same SPA as web |

Capability gates remain **role-based** (`can(role, capability)` in `packages/contracts`) —
not edition-based. Sync planes (metadata / artifacts) require an ACTIVE licence bound to
the hub; unbound desktop still works fully offline for local work.

## Surfaces

| Surface | Where | Auth |
|---------|-------|------|
| **Desktop node** | Packaged app / local stack (`desktop/`) | Firm login · offline grace |
| **AORMS web** (parity) | Cloud staff SPA | Firm login · ACTIVE licence |
| **External portals** | `aorms.in/access` (hub published store) | CLIENT / CONSULTANT / CONTRACTOR |
| **Account / licence hub** | `aorms.in/account` | Platform account |

## Sync scope (Free vs licensed desktop)

| Capability | Free / unbound desktop | Licensed desktop (ACTIVE + hub) | Web parity |
|------------|------------------------|----------------------------------|------------|
| Local authoring, calc, worker | Yes | Yes | Hub worker |
| Local Ollama / EOMS | Yes | Yes | Hub / BYO / degrade |
| Realtime metadata sync | No | Yes | Yes |
| Finalized artifact push | No | Yes | Server-side |
| Client/consultant portals | N/A (no publish) | Via hub after publish | Via hub |

Presets: `FREE_DESKTOP_CAPABILITIES` / `LICENSED_DESKTOP_CAPABILITIES` /
`WEB_PARITY_CAPABILITIES` in `packages/contracts/src/sync.ts`.

## Signup flow

1. Self-serve signup at `/account?mode=create` → firm workspace created.
2. Licence status **`ACTIVE`** with **5 GB** cloud storage quota.
3. Activate the licence on a desktop node (or use web only) — `syncToken` enables hub sync.
4. Company → AI for optional BYO API key (web / hub).

## Usage billing

| Meter | Included | Overage |
|-------|----------|---------|
| **Cloud storage** (published artifacts) | 5 GB | Per GB-month |
| **AI (hosted)** | Platform default model | Per token, or BYO key (no hosted meter) |
| **Local AI (desktop)** | Device resources | Not metered by AORMS |

## Licence states

| Status | Meaning |
|--------|---------|
| **`ACTIVE`** | Full workspace; storage + hosted AI meters apply; hub sync allowed |
| `SUSPENDED` | Blocked (billing or admin action) — platform-admin **Suspend for non-payment** (Usage billing) or Licences → Suspend; product node stamps `licence_status` on refresh 403 |
| `EXPIRED` / `GRACE` | Legacy token lifecycle — renew to ACTIVE; desktop keeps local work within signed-token grace |

### Legacy migration

Firms on historical **`LITE`**, **`PRO`**, **`ENTERPRISE`**, or **`CORE`** DB values
were migrated to **`ACTIVE`** with the same feature access and 5 GB default storage.
Tier enums in code are **deprecated shims** only.

## Enforcement

1. **`licenceStatus`** → `ACTIVE | SUSPENDED` (not LITE/PRO). `SUSPENDED` blocks writes even if a cached signed token is still within offline TTL.
2. **Storage** — `withinStorage(usedBytes, quotaBytes)` for **cloud** published objects; default 5 GB + purchased add-ons. Local FS on desktop is not counted against the cloud quota.
3. **AI** — meter hosted calls unless firm BYO key is set; desktop Ollama is local.
4. **Roles** — `permissions.ts` / `can()` for feature access.
5. **UI** — show "AORMS Standard" + storage/AI meters; desktop shows sync queue when hub-bound.
6. **Billing (P7)** — manual India path: Usage billing CSV → mark billed → suspend for non-payment. Stripe auto-suspend is not wired.

## Retired (do not reference)

| Retired | Replacement |
|---------|-------------|
| AORMS Community | Standard licence + optional unbound desktop |
| Lite / Pro / Enterprise / Core editions | ACTIVE + usage meters |
| Trial workspace requests | Self-serve signup or demo |
| Web-only product law (2026-07-19) | Local-first desktop + web parity ([LOCAL-FIRST.md](LOCAL-FIRST.md)) |
| AORMS Estimate as a separate desktop app | In-product estimating (rate books + BOQ) on desktop **and** web |
| Community self-host appliance | Desktop node or cloud workspace |

## Related docs

- [LOCAL-FIRST.md](LOCAL-FIRST.md)
- [ROADMAP.md](ROADMAP.md)
- [AORMS-IDENTITY.md](AORMS-IDENTITY.md)
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)
- [NAVIGATION.md](NAVIGATION.md) § Estimation
