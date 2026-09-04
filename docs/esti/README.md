# AORMS Documentation

**Status:** Canonical index · **Owner:** Human Centric Works (HCW) · **Reviewed:** 2026-09-04

> **Nomenclature:** **AORMS** = the platform. **AORMS Office Hub** = the single
> unified web app (no allied apps, no desktop apps, no per-app logins). **EOMS**
> = external knowledge bank API; **ESTI** = built-in AI agent. Full rules:
> [`../../CLAUDE.md`](../../CLAUDE.md) § Product naming.

This directory is the **single source of truth**. Superseded specs are moved to
[`archived/`](archived/) with a historical-notice banner — do not follow naming
or architecture guidance from anything under `archived/`.

**Platform north-star:** [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) ·
**Cleanup plan (in progress):** [OFFICE-SYSTEM-CLEANUP-PLAN.md](OFFICE-SYSTEM-CLEANUP-PLAN.md).

## Read first

1. [`../../CLAUDE.md`](../../CLAUDE.md) — naming, launch status, agent do/don't
2. [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) — product definition, what's live vs. removed
3. [NAVIGATION.md](NAVIGATION.md) — sidebar IA (unified office hub nav)
4. [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) — roles + access ladder
5. [ROADMAP.md](ROADMAP.md) — delivery status (web-only pivot in progress)
6. [ARCHITECTURE.md](ARCHITECTURE.md) — stack + ADRs
7. [CARBON-MIGRATION.md](CARBON-MIGRATION.md) + [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) — design system

Repo agent entry: [`../../CLAUDE.md`](../../CLAUDE.md).

## Canonical documents (one per topic)

| Topic | Document |
| --- | --- |
| Naming | [`../../CLAUDE.md`](../../CLAUDE.md) § Product naming |
| Product definition | [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) |
| Hosts / URLs | [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) |
| Navigation IA | [NAVIGATION.md](NAVIGATION.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |
| Market fit / GTM | [MARKET-FIT.md](MARKET-FIT.md) |
| Design system (Carbon migration) | [CARBON-MIGRATION.md](CARBON-MIGRATION.md) · [CARBON-PHASE1-STATUS.md](CARBON-PHASE1-STATUS.md) |
| Legacy design system (pre-Carbon) | [HCW-UI-KIT.md](HCW-UI-KIT.md) — being retired, see Carbon docs |
| UX laws | [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) |
| Design debt | [`../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md`](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) |
| Stack | [ARCHITECTURE.md](ARCHITECTURE.md) |
| India profile | [INDIA-PROFILE.md](INDIA-PROFILE.md) |
| Access / roles | [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) |
| Identity / login | [AORMS-IDENTITY.md](AORMS-IDENTITY.md) |
| HR / staff registry | [HR-PROFILE-SYSTEM.md](HR-PROFILE-SYSTEM.md) |
| Deploy | [VPS-INSTALL.md](VPS-INSTALL.md) · [PRODUCTION-OPS.md](PRODUCTION-OPS.md) |
| Brand heritage | [AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md) |
| Cleanup plan (pivot execution) | [OFFICE-SYSTEM-CLEANUP-PLAN.md](OFFICE-SYSTEM-CLEANUP-PLAN.md) |

Build: [DEVELOPMENT.md](../../DEVELOPMENT.md) · [INSTALL.md](../../INSTALL.md).  
Firm SOP: [docs/holagundi/](../holagundi/README.md).  
Kit docs: [docs/hcw-kit/](../hcw-kit/README.md).

## Precedence

0. [`../../CLAUDE.md`](../../CLAUDE.md) — naming + agent instructions
1. [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) — product definition, what exists
2. [NAVIGATION.md](NAVIGATION.md) — sidebar
3. [ARCHITECTURE.md](ARCHITECTURE.md) / [INDIA-PROFILE.md](INDIA-PROFILE.md) — constraints
4. [ROADMAP.md](ROADMAP.md) — delivery status

## Archived (`archived/`)

Historical documents from the pre-pivot multi-app suite era (AStudio,
AConsulting, AProc, ADraft, ShilpiDB, AORMS Connect desktop launcher) and the
local-first desktop-node model. Each carries a **⚠️ HISTORICAL** banner. Use
Git history for anything not preserved there.

## Change rule

Material features update this index / NAVIGATION / ROADMAP in the same PR.
**Archive** superseded specs (move to `archived/` with a historical banner) —
do not leave competing instructions live in this directory.
