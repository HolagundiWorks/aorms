# AConsulting

**Accelerated Consulting** — engineering consultancy workspace on the AORMS platform.

> **Scaffold only.** This empty repository is a future home for packaging /
> release metadata. **Do not** treat it as the application source of truth.

## Source of truth (today)

| Concern | Location |
| --- | --- |
| Product SPA + backend | Monorepo [`HolagundiWorks/esti`](https://github.com/HolagundiWorks/esti) |
| Desktop node stub | `esti/desktop/` |
| Public downloads portal | `https://aorms.in/downloads` |
| Naming | `esti/docs/esti/AORMS-PLATFORM-NOMENCLATURE.md` |
| Local-first law | `esti/docs/esti/LOCAL-FIRST.md` |

## App identity

| | |
| --- | --- |
| Title | AConsulting |
| Expansion | Accelerated Consulting |
| Slug | `aconsulting` |
| Workspace host | `https://consultancy.aorms.in` |
| Installer manifest | `esti/frontend/public/update-manifests/aconsulting.json` |

## Policy

- No app code move until the sibling-repo / contracts gate is green (Vish/Gagan).  

- Shared types stay in `@esti/contracts` inside the monorepo — do not invent a second contracts package here.  
- Signed installers are published by Local packaging; the web portal wires URL + sha256 only after signing.
