# AORMS — licensing & usage (2026-08)

> **Product law:** One **standard AORMS licence** for desktop apps (AStudio /
> AConsulting / AQC). **AI is unmetered** and runs on the **desktop**. Cloud stores
> **published** artifacts only (metadata · progress · finals). See
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
| **AI** | **Unmetered** on desktop (local Ollama and/or opt-in keys per app) — never required on hub for staff work |
| **Desktop** | **Only** staff runtime — WinUI 3 + C++ engine (fork [AQC](https://github.com/HolagundiWorks/AQC)) |
| **Web** | Marketing/demos on `aorms.in` · firm-branded **portals** · License Manager |

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

## Sync scope

| Capability | Unbound desktop | Licensed desktop | Firm portal |
|------------|-----------------|------------------|---------------|
| Local authoring, C++ calc, AI | Yes | Yes | No |
| Realtime metadata sync | No | Yes | Read |
| Finalized artifact push | No | Yes | Read |
| Client/consultant views | N/A | Via hub after publish | Yes |

Presets in `packages/contracts/src/sync.ts`. Bridge: [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md).

## Signup flow (target)

1. Firm obtains licence via HCW / License Manager (self-serve later).
2. Activate on desktop → `syncToken` enables hub sync.
3. Firm portal tenant provisioned for clients/partners.
4. Staff never log into `aorms.in` for ERP work.

## Usage billing

| Meter | Included | Overage |
|-------|----------|---------|
| **Cloud storage** (published artifacts) | 5 GB | Per GB-month |

AI is **not metered**.

## Licence states

| Status | Meaning |
|--------|---------|
| **`ACTIVE`** | Full desktop workspace; hub sync allowed |
| `SUSPENDED` | Blocked (billing or admin) |
| `EXPIRED` / `GRACE` | Desktop keeps local work within signed-token grace |

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
