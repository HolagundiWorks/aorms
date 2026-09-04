# AORMS — licensing & usage (2026-08)

> **Product law:** One **standard AORMS licence**. No trials, no tiers, no Community
> edition, no Lite/Pro/Enterprise split. You sign up, get an **ACTIVE** licence with
> the full workspace and **5 GB** cloud storage included. You pay for **extra storage**.
> **AI is unmetered** — it runs locally (Ollama) on the desktop node, or on the hub for
> web parity (badged **Hosted AI**); there is no per-token billing and no
> bring-your-own cloud key tier (removed #63).
>
> **Local-first (2026-08):** AORMS ships as **desktop preferred** (offline authoring,
> local calc/AI) with **full web parity** on the cloud hub. See
> [LOCAL-FIRST.md](LOCAL-FIRST.md).
>
> **Open source (now):** Keep products **open source**. **SaaS commercial
> licensing is deferred** — do not block engineering on SKU/commercial terms.
> AQC lineage uses AGPL community today; revisit dual-licence / SaaS terms later.
>
> Implementation queue: [ROADMAP.md](ROADMAP.md) § D-waves.

## One standard licence

| What you get | Detail |
|--------------|--------|
| **Licence** | `ACTIVE` — full desktop workspace for the licensed app SKU |
| **Users** | Unlimited staff on the firm’s desktop seats |
| **Clients / contractors / consultants / projects** | Unlimited |
| **Storage (cloud)** | **5 GB** published artifacts included; overage billed per GB-month |
| **AI** | **Unmetered.** Local Ollama on the desktop node; hub Ollama on web parity (badged **Hosted AI**); deterministic mock fallback when Ollama is unavailable |
| **Desktop** | **First-class** — local-first node (`ESTI_ROLE=node`); same SPA as web |

Capability gates remain **role-based** (`can(role, capability)`). Sync requires an
ACTIVE licence bound to the hub (`syncToken`).

## Surfaces

| Surface | Where | Auth |
|---------|-------|------|
| **Desktop app** | AStudio / AConsulting / AQC installers | Firm licence activate · offline grace |
| **Firm portal** | `{firm}.portal.aorms.in` or customer domain | CLIENT / CONSULTANT / CONTRACTOR / SITE |
| **Marketing** | `aorms.in` · product hosts | Public — demos only |
| **License Manager** | `admin.aorms.in` | HCW operators |
| **Account hub** | Transitional on apex | Prefer licence onboarding |

**Retired:** browser staff ERP / “web parity” staff SPA as a product surface.

| Capability | Free / unbound desktop | Licensed desktop (ACTIVE + hub) | Web parity |
|------------|------------------------|----------------------------------|------------|
| Local authoring, calc, worker | Yes | Yes | Hub worker |
| Local Ollama / EOMS | Yes | Yes | Hub (Hosted AI) / degrade |
| Realtime metadata sync | No | Yes | Yes |
| Finalized artifact push | No | Yes | Server-side |
| Client/consultant portals | N/A (no publish) | Via hub after publish | Via hub |

| Capability | Unbound desktop | Licensed desktop | Firm portal |
|------------|-----------------|------------------|---------------|
| Local authoring, C++ calc, AI | Yes | Yes | No |
| Realtime metadata sync | No | Yes | Read |
| Finalized artifact push | No | Yes | Read |
| Client/consultant views | N/A | Via hub after publish | Yes |

Presets in `packages/contracts/src/sync.ts`. Bridge: [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md).

1. Self-serve signup at `/account?mode=create` → firm workspace created.
2. Licence status **`ACTIVE`** with **5 GB** cloud storage quota.
3. Activate the licence on a desktop node (or use web only) — `syncToken` enables hub sync.
4. Company → AI to pick the local Ollama model (desktop) or use hub **Hosted AI** (web parity); AI is unmetered.

## Usage billing

| Meter | Included | Overage |
|-------|----------|---------|
| **Cloud storage** (published artifacts) | 5 GB | Per GB-month |

**Cloud storage is the only usage meter.** AI is **not metered** — it runs locally
(desktop Ollama) or on the hub for web parity (badged **Hosted AI**), with a
deterministic mock fallback when Ollama is down. No per-token billing, no
bring-your-own cloud key.

## Licence states

| Status | Meaning |
|--------|---------|
| **`ACTIVE`** | Full workspace; cloud-storage meter applies (AI is unmetered); hub sync allowed |
| `SUSPENDED` | Blocked (billing or admin action) — platform-admin **Suspend for non-payment** (Usage billing) or Licences → Suspend; product node stamps `licence_status` on refresh 403 |
| `EXPIRED` / `GRACE` | Legacy token lifecycle — renew to ACTIVE; desktop keeps local work within signed-token grace |

### Legacy migration

Firms on historical **`LITE`**, **`PRO`**, **`ENTERPRISE`**, or **`CORE`** DB values
were migrated to **`ACTIVE`** with the same feature access and 5 GB default storage.
Tier enums in code are **deprecated shims** only.

## Enforcement

1. **`licenceStatus`** → `ACTIVE | SUSPENDED` (not LITE/PRO). `SUSPENDED` blocks writes even if a cached signed token is still within offline TTL.
2. **Storage** — `withinStorage(usedBytes, quotaBytes)` for **cloud** published objects; default 5 GB + purchased add-ons. Local FS on desktop is not counted against the cloud quota.
3. **AI** — **unmetered**. Runs locally (desktop Ollama) or on the hub for web parity (**Hosted AI**), with a deterministic mock fallback when Ollama is unavailable. No per-token meter, no BYO cloud key (removed #63).
4. **Roles** — `permissions.ts` / `can()` for feature access.
5. **UI** — show "AORMS Standard" + the cloud-storage meter; desktop shows sync queue when hub-bound.
6. **Billing (P7)** — manual India path: Usage billing CSV → mark billed → suspend for non-payment. Stripe auto-suspend is not wired.

## Retired (do not reference)

| Retired | Replacement |
|---------|-------------|
| Web staff parity ERP | Desktop-only staff · firm portals |
| Hosted AI as staff path | Desktop AI only |
| Apex firm ERP logins | Marketing/demos only on `aorms.in` |
| Lite / Pro / Enterprise editions | ACTIVE + storage meter |
| Separate Estimate desktop | In-app via AQC C++ engine |
| SaaS commercial SKU urgency | **Deferred** — stay open source for now |

## Related docs

- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md)  
- [ROADMAP.md](ROADMAP.md) · [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)  
- [AORMS-IDENTITY.md](AORMS-IDENTITY.md)  
