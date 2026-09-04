# Phase 6 repo audit — Advanced processing (PDF/DWG, Python worker)

**Status:** Draft audit, not yet reviewed against a Phase 6 implementation
**Date:** 2026-09-04
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37
and [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 6 definition — the Python
worker (`worker/`), the Redis Streams job bus that feeds it, and every PDF/DXF/
Markdown/reconciliation job Phases 3–5 deferred to "whenever Phase 6 lands."
Same audit shape as Phases 2–5; Phase 7 (AI) gets its own pass.

---

## This phase is different in kind from Phases 2–5 — read this section first

Every prior phase asked "how do these tRPC procedures become Server Actions/
Route Handlers, and these Drizzle tables become Supabase tables with RLS."
Phase 6 has almost none of that shape. What it actually has:

- A **standalone Python process** (`worker/esti_worker/main.py`) that never
  stops running, consuming a **Redis Streams** consumer group with its own
  retry/dead-letter semantics (up to 3 delivery attempts, 30s idle reclaim,
  poison jobs routed to `esti:jobs:dead`).
- **Four job types** doing real, heavy, non-trivial computation:
  `render_pdf` (WeasyPrint HTML→PDF, 14 document renderers), `dxf_to_svg`
  (`ezdxf` CAD parsing + SVG rendering), `pdf_to_markdown` (`pymupdf4llm`),
  `reconcile_import` (`pandas` bank-statement matching).
- A **BYOS (bring-your-own-storage)** abstraction the worker and the TS
  backend both resolve independently from the same `esti_orgsettings` row —
  three modes (`DEFAULT` env S3/MinIO, `NAS` local filesystem, `S3` firm's own
  endpoint) — not just "the object storage client," a per-firm routing layer.

None of this is "port a tRPC procedure to a Server Action." **The central
question this phase has to answer before any code changes is a deployment-
topology question, not a code-mapping one**: does a persistent Python process
+ Redis have a home on **Hostinger Managed App Hosting** (the migration's
stated target per `CLAUDE.md`), or does this phase mean keeping the worker+
Redis running elsewhere (the current VPS, a small dedicated box, a managed
Redis + container service) while everything else moves? This audit does not
have enough information to answer that — it's a hosting-platform capability
question, not a repository question — and flags it as the phase's single
biggest open decision, ahead of any table mapping below.

**Recommended framing for whoever picks this phase up:** research Hostinger
Managed App Hosting's support for (a) a long-running background worker process
alongside the main app and (b) a managed or bring-your-own Redis instance,
before writing any migration code. If either is unsupported, the realistic
options are: keep `worker/` + Redis on the existing VPS as an external service
the Next.js app calls into over HTTPS (simplest, smallest blast radius, but
means the "single deployment target" goal in the migration spec's § 1
objectives doesn't fully hold), or replace the queue layer with something
Hostinger-native (Supabase has no built-in job queue; `pg_cron` + a polling
table, or Supabase Edge Functions triggered by DB webhooks, are the closest
primitives, but neither replicates Redis Streams' consumer-group retry/DLQ
semantics without real engineering). **Don't guess at this — it's a decision
for whoever has visited Hostinger's actual docs/dashboard, not something to
infer from this codebase.**

---

## What ports cleanly regardless of the topology decision

Whatever the hosting answer turns out to be, these are unaffected by it and
can be scoped now:

- **The job payload contract** (`{ type, payload: JSON }` on the stream,
  per `backend/src/lib/redis.ts`'s `JobType` union and `ADR-10`'s
  "language-neutral contract" framing) stays the same shape whether the
  consumer is reached via Redis Streams or an HTTP call — the four job
  handlers' actual logic (WeasyPrint HTML generation, `ezdxf` parsing,
  `pymupdf4llm` conversion, `pandas` matching) doesn't change either way.
- **`_RENDERERS`' HTML-template functions** (`worker/esti_worker/jobs/pdf.py`)
  are pure string-building functions taking a fetched record + firm dict —
  completely independent of how the record was fetched or how the job was
  triggered. If the fetch layer moves from raw `psycopg` (`worker/esti_worker/
  db.py`) to a Supabase service-role client, only the fetch functions change;
  every `_*_html()` template function ports untouched.
- **Object storage**: Supabase Storage is the direct target-stack replacement
  for the `DEFAULT` env-S3/MinIO mode either way (this was already the
  Phase 2 audit's assumption for uploads). The BYOS `NAS`/`S3` per-firm modes
  are a separate scope question — see below — but don't block porting the
  `DEFAULT` path.

---

## BYOS storage — scope decision, not a technical blocker

`storage_settings` on the single-row `esti_orgsettings` lets a firm point
their whole deployment at a mounted NAS path or their own S3-compatible
endpoint, resolved independently (and duplicated) in both the TS backend
(`backend/src/lib/storage.ts`) and the Python worker (`worker/esti_worker/
storage.py`) — same three-mode logic, two implementations, kept in sync by
convention rather than a shared module (expected, given one is TypeScript and
one is Python, but worth naming as a duplication to watch for drift in).
`NAS` mode assumes a locally-mounted filesystem path, which fits the current
per-firm VPS install model but has no obvious meaning on Hostinger Managed App
Hosting (no mounted NAS by default). **Recommend**: port `DEFAULT` (→ Supabase
Storage) and firm-`S3` (→ any S3-compatible endpoint, unchanged concept) modes;
treat `NAS` mode as out of scope for the hosted-SaaS target unless a specific
customer need for it surfaces later — flag rather than silently drop it, since
it's a real feature for the self-hosted VPS deployment model that stays live
per the roadmap's "current production stack stays live and unchanged."

---

## Job 1 — `render_pdf` (WeasyPrint)

| | Current | Notes for target |
| --- | --- | --- |
| Dispatch | `_RENDERERS` maps a `target` string to `(fetch, render_html, update, folder)` tuples — 13 registered targets plus a `drawing` special case (issue-set PDF, not going through `_RENDERERS`) | Same dispatch table shape works regardless of transport; each tuple's three DB-touching functions are the only pieces requiring the Supabase-client swap |
| Coverage vs. audited phases | `invoice` (Phase 3), `feeproposal`/`proposal` (Phase 3), `letter` (Phase 3), `transmittal`/`specsheet`/`inspection` (Phase 4), `measurement_book` (the plan-markup/measurement-book complex Phase 4 flagged as out of scope) | These five phases' worth of `create`/`generatePdf` Server Actions all ultimately call into this same job — no new business logic here, just confirms the fan-out this audit already anticipated in Phases 3–4 |
| Coverage **outside** any audited phase | `payslip` (Payroll/HR — no phase has audited HR yet), `progress_report`/`site_instruction`/`pmc_ra_bill` (AProc/Delivery/site-supervision — flagged as out-of-scope-for-now in both Phase 3 and Phase 4, still nobody's), `feasibility_report` (Project OS Slice D pre-project assessment — not mentioned in any phase 2–5 audit at all) | **These four renderer targets reveal a roadmap gap, not just a Phase 6 finding**: HR/Payroll and Delivery/Site-supervision/AProc have no assigned phase number in `ROADMAP-CLOUD.md`'s Phase 2–7 table at all. Worth raising to whoever owns the roadmap — this audit only surfaces the gap, doesn't resolve it (out of a repo-auditing session's scope to invent a new phase number) |
| **Dead code found** | `engagement_register` target (`_engagement_register_html`, `fetch_engagement_full`/`update_engagement` in `db.py`) reads/writes `esti_cons_engagement`, `esti_cons_deliverable`, `esti_cons_review_step`, `esti_cons_fee_stage`, `esti_cons_tq`, `esti_cons_variation` — **none of these tables exist in `backend/src/db/schema/` any more**. `CLAUDE.md`'s Removed section confirms: "the `consultancy` backend module... is physically removed (2026-09)." This renderer target is dead code left behind by that teardown — it would 500 if ever invoked (`esti_cons_engagement` doesn't exist to query) | **Not this migration's problem to fix** (it's a pre-existing cleanup gap in the current codebase, not something to port), but don't port `engagement_register`/`_engagement_register_html`/`fetch_engagement_full`/`update_engagement` — they reference a removed feature. Flagging as a spawn-off cleanup task is appropriate; not doing that from inside this audit |
| Watermarking | `_inject_watermark()` — a pure string function overlaying a rotated `<div>` on rendered HTML before PDF conversion, used for drawing issue-sets (and available to any renderer via `payload.watermark`) | Pure function, ports as-is |
| Idempotency | `_already_ready()` — skips re-render if `pdf_status == READY` and a key already exists, returned as `{status: "skipped"}` rather than re-rendering | Port as-is; same check whether the fetch is `psycopg` or Supabase |

---

## Job 2 — `dxf_to_svg` (ezdxf)

| | Current | Notes for target |
| --- | --- | --- |
| Processing | Reads a DXF from storage, computes real geometry-derived bounds (`bbox.extents()`, not the DXF header's `$EXTMIN`/`$EXTMAX`, which the code comment notes is "unreliable — unset CAD files carry ±1e20 sentinels" — a real gotcha worth preserving), renders modelspace to SVG via `ezdxf.addons.drawing`, counts entities per layer, writes `layers`/`bounds`/`svgKey`/`entityCount` back to `esti_drawing` (Phase 4's `drawings` table) | Pure Python/`ezdxf` logic, transport-independent — same "swap the fetch/update functions, keep the parsing" pattern as `render_pdf` |
| Dependency confirmed | This is exactly the dependency Phase 4's audit flagged and deferred — "DXF→SVG conversion needs the Python worker... land the CRUD/upload/schema now, either stub the enqueue or wire it if Redis Streams gets ported early" | No new finding here, just closes the loop Phase 4 opened |

---

## Job 3 — `pdf_to_markdown` (pymupdf4llm)

| | Current | Notes for target |
| --- | --- | --- |
| Purpose | Converts an uploaded PDF (Knowledge Bank / Repo portal source document) to Markdown, batching 25 pages at a time, writing to `esti_repo_source.markdown_text`/`raw_text`/`convert_status` | Pure conversion logic, transport-independent |
| **Stale comment found** | The module docstring says: *"Uses pymupdf4llm — the same library as HolagundiWorks/hcw-markdown-tool — to convert uploaded textbooks into markdown **before EOMS ingest**."* Per `CLAUDE.md`'s Removed section, **EOMS was retired 2026-09 and physically removed** (`backend/src/lib/eoms/`, `backend/src/modules/eoms/`, etc.) — this comment describes a pipeline stage that no longer exists. `CLAUDE.md` itself already notes the correct current framing: `KnowledgeBankPortal.tsx`'s AI rephrase action "is unrelated internal processing, kept, UI-relabelled off the EOMS name" | Not a migration blocker, but worth a one-line doc fix while this file is touched during Phase 6 implementation — update the docstring to describe the Knowledge Bank portal's actual current pipeline instead of the removed EOMS ingest step. Flagging rather than fixing here, since fixing is an implementation-time edit, not an audit |
| Table | `esti_repo_source` — **resolved by the [Phase 8 audit](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)**: not dead code, owned by the live `knowledgeBankPortal` tRPC namespace (`CLAUDE.md` confirms `KnowledgeBankPortal.tsx` is a kept feature). This job type is live and should be ported alongside Phase 8's Knowledge Bank Portal domain | Port together with Phase 8's `knowledgeBankPortal` CRUD — this job is its processing half |

---

## Job 4 — `reconcile_import` (pandas)

| | Current | Notes for target |
| --- | --- | --- |
| Purpose | Parses a bank-statement CSV/XLSX, resolves date/description/amount columns via alias matching (handles Indian bank export quirks: parenthesized debits, trailing-minus debits, `Dr` suffixes — all normalized to signed paise, a real correctness detail worth preserving verbatim), matches credit lines against `esti_invoice` rows fetched via `fetch_open_invoices()`, writes matched/unmatched results back to `esti_reconcile` (Phase 3's `reconciliations` table, explicitly deferred there) | Pure `pandas` logic, transport-independent |
| Closes a Phase 3 loop | Phase 3's audit deferred all of reconciliation ("depends on the Python worker... a large feature in its own right, not 'Commercial' CRUD") — this is that feature. Matching logic (column-alias resolution, sign normalization) is worth porting verbatim rather than re-deriving; it encodes real Indian-bank-statement-format knowledge that took debugging to get right (per the code comment about the sign-parsing bug it fixes) | Table + matching logic port together in this phase per the plan Phase 3 already set up; the invoice side (`esti_invoice.paidPaise`, referenced as a Phase 3 field but never written by any Phase 3 mutation) presumably gets updated by whatever consumes reconciliation results — **not found in this audit's reading of `reconcile.py`, which only writes `esti_reconcile`, not `esti_invoice.paid_paise`** — trace the actual `paidPaise`-setting code path before implementing, it may live in a `reconcile` tRPC mutation not read here |

---

## The queue/retry infrastructure itself

| | Current | Target |
| --- | --- | --- |
| Transport | Redis Streams, one stream (`esti:jobs`) + one consumer group (`esti-workers`), `XADD`/`XREADGROUP`/`XACK`/`XAUTOCLAIM` | Depends entirely on the topology decision at the top of this audit. If Redis stays available (external service): no change needed, `enqueueJob()` (`backend/src/lib/redis.ts`) ports as-is, called from Server Actions instead of tRPC mutations. If Redis is not available on the target host: needs a real replacement design (out of this audit's scope to invent) |
| Retry/backoff | Up to 3 delivery attempts, 30s idle-reclaim via `XAUTOCLAIM`, poison jobs routed to `esti:jobs:dead` with the original id/attempts/error preserved | This specific mechanism (consumer-group pending-entries list + idle reclaim) is a Redis Streams primitive with no direct equivalent in a from-scratch Postgres-based queue — a naive `pg_cron` polling replacement would need to reimplement delivery-count tracking and idle-reclaim logic by hand. Not a reason to avoid the redesign if the topology forces it, just a reason to budget real engineering time for it rather than treating it as a drop-in swap |
| Correlation | `request_id` propagated payload→worker for log correlation (`ADR O3`, per the code comment) | Port the concept regardless of transport — whatever calls the worker (HTTP, a new queue) should still pass through a request id for tracing |

---

## Suggested Phase 6 approach

Unlike Phases 2–5, this phase doesn't have a clean "landing order" of tables to
sequence — it has one gating decision and then four independent job ports:

1. **Answer the hosting-topology question first** (Redis + persistent worker
   on Hostinger Managed App Hosting: supported, or externalized). Everything
   else in this phase is downstream of that answer.
2. **Port the four job handlers' pure logic** (HTML templates, `ezdxf`
   parsing, `pymupdf4llm` conversion, `pandas` matching + the Indian-bank
   sign-parsing logic) largely unchanged regardless of #1's answer — only the
   fetch/update functions (`db.py`) and the storage client (`storage.py`) need
   to target Supabase instead of raw `psycopg`/`boto3`-to-self-hosted-MinIO.
3. **Drop the dead `engagement_register` renderer** rather than porting it
   (references physically-removed tables).
4. ~~Confirm whether `pdf_to_markdown`/`esti_repo_source` is still a live
   feature~~ — **resolved by the [Phase 8 audit](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)**:
   it's live, port alongside Phase 8's Knowledge Bank Portal domain.
5. **Wire `reconcile_import`'s output to `invoices.paid_paise`** — trace and
   port whatever currently connects a matched reconciliation line to marking
   an invoice paid; not found in this audit's reading of the worker side
   alone.
6. ~~Raise the HR/Payroll and Delivery/Site-supervision/AProc roadmap gap~~ —
   **addressed**: [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) now covers
   both domains (proposed addition to the roadmap, not yet adopted).

---

## What this audit deliberately did not cover

- **Whether Hostinger Managed App Hosting supports a persistent background
  process and/or managed Redis** — a hosting-platform capability question,
  not something to determine from the repository. Flagged as the phase's
  central open decision, not answered.
- **The actual code path that sets `invoices.paid_paise`** — flagged as
  missing from this audit's read of `reconcile.py`, not traced further.
- ~~Project OS feasibility~~ (`feasibility_report` target) — **resolved by the
  [Phase 10 audit](./NEXTJS-MIGRATION-PHASE10-AUDIT.md)** (Slice D of the
  "Project OS" lead-to-activation pipeline, `feasibility.generate` in
  `backend/src/modules/projectos/feasibility.ts`), not audited in depth here
  (each finding would need its own audit pass the way Phases
  2–5 did for their domains, if/when a phase number is assigned to them).
- Phase 7 (AI/ESTI) — own audit pass when its turn comes. Note: this audit's
  reading confirms (per the Phase 5 audit's finding) that the dashboard's rule-
  based "cognition" engine is unrelated to Phase 7's actual LLM-backed ESTI AI
  — nothing in the Python worker touches an LLM either; Phase 6 is entirely
  deterministic document/data processing.
