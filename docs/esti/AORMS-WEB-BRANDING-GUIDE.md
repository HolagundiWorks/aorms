# AORMS `web/` Branding & Shell Guide

**Scope:** the live Next.js + Carbon Design System stack (`web/`) — the
Office Hub and the three AORMS Platform portals (Identity, ConnectDeX,
SysDeX). This is a **separate document from
[`AORMS-BRANDING-KIT.md`](AORMS-BRANDING-KIT.md)**, which describes the
old React/Vite/MUI frontend's own design language (Radiant Orange accent,
neumorphism, Rail/Stage layout) — a different, superseded stack per
CLAUDE.md's own stale-doc corrections. Nothing here overrides
`AORMS-BRANDING-KIT.md`'s validity for that old codebase; it simply
doesn't apply to `web/`, which runs a genuinely different system (Carbon
tokens, not MUI theme; square Carbon `Tile`/`Header`, not glass rails).

---

## 1. Product identity hierarchy

```
AORMS                          — the master brand (one product)
├── Office Hub                 — the firm-facing app (aorms.in / app.aorms.in)
├── Identity Portal            — architects & Studios (identity.aorms.in)
├── ConnectDeX Portal          — material/interior suppliers (connectdex.aorms.in)
└── SysDeX                     — platform staff admin (sysdex.aorms.in)
```

Four surfaces, one brand. Office Hub and the three Platform portals are
**sub-brands of AORMS**, not separate products — see
[`AORMS-PLATFORM-ARCHITECTURE.md`](AORMS-PLATFORM-ARCHITECTURE.md) § Three
portals for the underlying tenancy/audience split each one serves.

**"AORMS Office Hub" is not a name to display as a single unit.** Per the
2026-09-14 shell/identity remediation, the primary identity a signed-in
user sees is the organisation they're in (a firm's own name in Office
Hub) or the portal's own name (Identity Portal / ConnectDeX Portal /
SysDeX) — never a compound "AORMS <workspace>" string. The AORMS mark
itself appears as a small, subtle watermark, not competing for primary
billing in the header.

---

## 2. Logo & marks

One asset, reused everywhere: **`/aorms-logo.png`** (a flat PNG, ~14KB).
No per-portal logo variants, no recoloring, no masking — unlike the old
kit's orange-recolored mask treatment, `web/`'s Carbon governance
(CLAUDE.md § UI) rules out brand-specific CSS tricks on stock assets.

- **Office Hub**: the logo does *not* appear in the header at all
  (removed 2026-09-14, explicit decision — the header leads with the
  firm's own name instead). Its home is `BrandWatermark.tsx`: fixed,
  bottom-right corner, 16px tall, 35% opacity, non-interactive.
- **Platform portals**: the logo appears in the header proper (see § 4),
  since these portals don't have a "firm name" of their own to lead
  with — the AORMS/portal identity *is* the primary identity here.

---

## 3. Typography & colour

Governed entirely by CLAUDE.md § UI / design system — **IBM Carbon
Design System v11**, IBM Plex Sans, Carbon theme tokens
(`--cds-*`). Nothing brand-specific to add here: no second accent hue, no
custom font, no raw hex. A portal's own identity is expressed through
**text** (its name and tagline) and **Carbon's own status tokens** for
state — never a bespoke portal color.

---

## 4. Header anatomy — the shared shell standard

Every top-level surface in `web/` (Office Hub and all three Platform
portals) follows the same header anatomy, built from stock Carbon UI
Shell components (`Header`, `HeaderName`, `HeaderNavigation`,
`HeaderMenuItem`, `HeaderGlobalBar`) — never a hand-rolled `<header>` +
flexbox `<nav>` (the pre-2026-09-14 Platform portal headers' own
pattern, now retired in favor of this).

```
┌──────────────────────────────────────────────────────────────────┐
│ [Portal/Org name]   Nav item · Nav item · Nav item   Good evening,│
│                                                        Name  [AV] │
└──────────────────────────────────────────────────────────────────┘
```

| Slot | Office Hub | Identity / ConnectDeX / SysDeX |
|---|---|---|
| Leading identity (`HeaderName`) | The signed-in firm's own name (`OrganisationIdentity.tsx`) | The portal's own name + tagline (`PlatformShellHeader.tsx`) |
| Nav | Collapsible `SideNav` (left rail) | `HeaderNavigation` (top, flat — these portals are narrow enough in scope that a side rail is unwarranted; kept consistent with each other, not forced to match Office Hub's own nav shape 1:1 where the two genuinely differ in size) |
| Trailing identity | `HeaderUserMenu.tsx` — greeting (first name, honorific-stripped) + avatar initials + dropdown (name, role, Firm Settings, Sign out) | `PlatformShellHeader.tsx`'s own greeting + avatar, dropdown scoped to what that portal actually has (Sign out; SysDeX also gets its admin-only links already in the nav, not duplicated in the dropdown) |
| Brand watermark | `BrandWatermark.tsx`, fixed bottom-right | Same component, reused as-is |

**Why nav differs (SideNav vs. HeaderNavigation) rather than forcing an
identical rail onto all four surfaces:** Office Hub has ~40 destinations
across 9 groups — a collapsible rail is load-bearing there. Each Platform
portal has 3-8 flat links total; wrapping that in a collapsible SideNav
would be structure for its own sake, not a real usability need. What
*is* shared, deliberately, across all four: the same Carbon primitives,
the same identity-block anatomy (leading name+context, trailing
greeting+avatar+menu), the same watermark, the same typographic scale.
Consistency is enforced at the component level (one `PlatformShellHeader`
all three portals render), not by forcing every surface into identical
literal markup regardless of fit.

---

## 5. Per-portal identity

| Portal | Name | Tagline | Home | Audience |
|---|---|---|---|---|
| Office Hub | *(the firm's own name)* | — | `/pulse` | Firm staff |
| Identity Portal | Identity Portal | For architects & Studios | `/identity` | Individual architects, Studio members |
| ConnectDeX Portal | ConnectDeX Portal | For material & interior suppliers | `/connectdex` | Companies (material/interior suppliers) |
| SysDeX | SysDeX | Platform administration | `/admin` | Platform staff (`accounts.is_admin`) |

Source of truth for the audience/tenancy split behind these names:
[`AORMS-PLATFORM-ARCHITECTURE.md`](AORMS-PLATFORM-ARCHITECTURE.md) § Three
portals — this table is a display-copy mirror of it, not a second
definition; if the two ever disagree, that document wins.

---

## 6. Implementation

- `components/aorms/platform/PlatformShellHeader.tsx` — the one shared
  header component all three Platform portals render (parameterized by
  name/tagline/home/nav items), replacing the three separate hand-rolled
  headers `components/aorms/platform/PortalHeaders.tsx` used to define.
- `components/aorms/AppShell.tsx` / `HeaderUserMenu.tsx` /
  `OrganisationIdentity.tsx` / `BrandWatermark.tsx` — Office Hub's own
  shell, built 2026-09-14 (see that work's own commit history for the
  detailed rationale of each piece: honorific-stripped first-name
  greetings, real IST-time-of-day greeting, top-status-stripe KPI cards,
  etc. — conventions this guide's § 4 generalizes, not a separate story).
