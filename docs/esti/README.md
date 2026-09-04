# AORMS Documentation

**Status:** Canonical index · **Owner:** Human Centric Works (HCW) · **Reviewed:** 2026-09-04

> **Nomenclature:** **AORMS** = the platform, pure architectural consultancy
> (not engineering, not multi-discipline AEC). **AORMS Office Hub** = the
> single unified web app (no allied apps, no desktop apps, no per-app logins).
> **ESTI** = built-in AI agent. **EOMS** (external knowledge bank API) is
> retired (2026-09). Full rules: [`../../CLAUDE.md`](../../CLAUDE.md) § Product naming.

This directory is the **single source of truth**. Superseded specs are deleted
outright, not archived (policy since 2026-09-04) — there is no `archived/`
folder to check for older guidance; if a doc is here, it's current.

**Platform north-star:** [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md).

## Read first

1. [`../../CLAUDE.md`](../../CLAUDE.md) — naming, launch status, agent do/don't
2. [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) — product definition, what's live vs. removed
3. [NAVIGATION.md](NAVIGATION.md) — sidebar IA (unified office hub nav)
4. [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) — roles + access ladder
5. [ROADMAP.md](ROADMAP.md) — index into [ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) (what's live) and [ROADMAP-LOCAL.md](ROADMAP-LOCAL.md) (engineering in progress)
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
| Roadmap — what's live (cloud) | [ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) |
| Roadmap — engineering (local dev) | [ROADMAP-LOCAL.md](ROADMAP-LOCAL.md) |
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

Build: [DEVELOPMENT.md](../../DEVELOPMENT.md) · [INSTALL.md](../../INSTALL.md).  
Firm SOP: [docs/holagundi/](../holagundi/README.md).  
Kit docs: [docs/hcw-kit/](../hcw-kit/README.md).

## Precedence

0. [`../../CLAUDE.md`](../../CLAUDE.md) — naming + agent instructions
1. [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) — product definition, what exists
2. [NAVIGATION.md](NAVIGATION.md) — sidebar
3. [ARCHITECTURE.md](ARCHITECTURE.md) / [INDIA-PROFILE.md](INDIA-PROFILE.md) — constraints
4. [ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) / [ROADMAP-LOCAL.md](ROADMAP-LOCAL.md) — delivery status

## Change rule

Material features update this index / NAVIGATION / ROADMAP-CLOUD / ROADMAP-LOCAL in the same PR.
**Delete** superseded specs outright — per the no-archive policy above, do
not leave competing instructions live in this directory. Use Git history for
anything not preserved here.
