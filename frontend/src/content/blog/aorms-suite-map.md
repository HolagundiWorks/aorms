---
title: AORMS suite map — managers, technical apps, drafting
date: 2026-08-08
excerpt: A clear map of the AORMS product suite: AStudio and AConsulting practice managers; AQC Estimation, BBS, and Project Management; ADraft and ShilpiDB; firm portals online. What each product owns — and what it deliberately does not.
tags: Suite, Product, Map
author: Human Centric Works
---

AORMS is the **suite brand and cloud spine**, not a single mega-app. Use this map when you evaluate what belongs on the desktop, what syncs to the hub, and what clients see.

## Practice managers

| Product | Audience | Owns | Does **not** own |
| --- | --- | --- | --- |
| **AStudio** | Architecture practices | Tasks, office, HR, payroll views, client / third-party communications, portal publish | BOQ calc, BBS math, CAD entities |
| **AConsulting** | Engineering consultancies | Same manager surface for engineering engagements | Same technical exclusions |

Managers are local-first apps that sync **published** ops to Mongo via the hub. They do not absorb Estimation or BBS screens.

## Technical apps (AQC lineage)

Three installers; one shared C++ **`bbs_engine`**.

| Product | Role | Publishes to portals |
| --- | --- | --- |
| **AQC Estimation** | Rate books, BOQ, measurement | Estimate totals / issued PDFs |
| **AQC BBS** | Bar bending, steel reconciliation | Issued BBS PDFs, kg summaries |
| **AQC Project Management** (AProc) | Programme, packages, RA / progress | Milestones %, RA certs, progress reports |

Calculations never re-run in the cloud. Draft lines never leave the machine.

## Drafting and geometry

| Product | Role |
| --- | --- |
| **ADraft** | Local 2D CAD drafting (Accelerating Drafting) |
| **ShilpiDB** | Spatial vector store (`.vdb`, spatial index, `shilpi-http` for published packages) |

Mongo never stores CAD entities. ShilpiDB never stores payroll.

## Online surfaces

| Surface | Role today |
| --- | --- |
| **aorms.in** | Suite home, blog, downloads (installers **coming soon**); soft launch — sign-in coming soon |
| **Firm portals** | Client / consultant / contractor / site — published Updates, Progress, Drawings, Documents |
| **EOMS** | External knowledge bank (codes / compliance) |
| **ESTI** | Internal AI on desktop managers |

## How the pieces talk

```text
Desktop managers + AQC apps + ADraft
        │ publish ops / PDFs / drawing packages
        ▼
   AORMS hub (Mongo ops + object store + Shilpi publish)
        │
        ▼
   Firm-branded portals (read published only)
```

## Related reading

- [Why the AORMS suite matters](/blog/why-aorms-suite-matters)
- [How the suite solves fragmented practice tools](/blog/how-aorms-suite-solves-fragmented-practice)
- [Local-first notes](/blog/aorms-local-first)
- [Suite home](/)
