---
title: AORMS local-first — desktop preferred, web parity (supersedes web-only)
date: 2026-08-05
excerpt: AStudio runs as a local-first desktop node and in the browser — same SPA, same Standard licence. Metadata syncs via the cloud hub; finalized docs publish on issue. Legacy Manager installers stay retired.
tags: Product, Platform, Operations
author: Human Centric Works
supersedes: aorms-is-web-only
---

> **Product law update (2026-08).** This post replaces the July 2026 “web-only”
> announcement. Canonical docs: [LOCAL-FIRST](/wiki) / repo
> `docs/esti/LOCAL-FIRST.md`, `docs/esti/PLANS-AND-TIERS.md`.

AORMS is still **one Standard licence** and **one SPA** — now on two hosts:

1. **Desktop node (preferred)** — local Postgres, worker, and Ollama; offline authoring; syncs compact metadata and finalized documents to the hub when licensed.
2. **Web parity** — same workspace in the browser at `studio.aorms.in`, with hub-side AI/worker or your own API key.

## What stayed retired

- Lite / Pro / Community **Manager** installers (SKU matrix)
- A separate **Estimate** desktop app (estimating stays in-product: Rate Books + project Estimation)

Signed local-first installers (when packaging ships) are listed at
[`/downloads`](/downloads) — until then the page keeps honest web-workspace CTAs.
Legacy `/download` redirects there.

## Why local-first

Indian practices need low latency and reliable work when the WAN is poor.
Keeping drafts, measurements, and AI on the machine — while sharing tasks,
progress, and issued PDFs through the hub — matches how firms already operate.

Sign in at [studio.aorms.in](https://studio.aorms.in), check
[downloads](/downloads) for the signed desktop node when it ships, or follow
Local-first notes in the repo roadmap.
