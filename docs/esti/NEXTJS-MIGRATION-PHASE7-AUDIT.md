# Phase 7 repo audit — Optional AI (ESTI)

**Status:** Draft audit, not yet reviewed against a Phase 7 implementation
**Date:** 2026-09-04
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37
and [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 7 definition — the `ai`
tRPC namespace, its AI gateway, retrieval/context-assembly, PII redaction, and
the draft-approval workflow. Last phase in the 2–7 audit sequence.

---

## The central finding, corrected — this audit's original claim was based on an incomplete read; the architecture is not actually broken

**This section originally claimed a three-way contradiction between `CLAUDE.md`,
`PRODUCTION-OPS.md`, and the code. That claim doesn't hold up against fuller
evidence and is corrected here rather than left standing** — in keeping with
this series' own rule of fixing findings once shown wrong, not just adding new
ones.

At the time this audit was first written, `CLAUDE.md` said ESTI was
desktop-only and cited an archived `LOCAL-FIRST.md`. **`CLAUDE.md` has since
been corrected** (by a later session, independent of this audit) — it now
reads: *"ESTI runs as part of the office hub (web-only, 2026-09 pivot) — not
a desktop app. It calls a self-hosted Ollama container alongside the backend
(`compose.yaml`/`compose.prod.yaml` `ollama` service), not a user's own
machine,"* and explicitly notes the old desktop-only docs *"were deleted 2026-09
with the rest of `docs/esti/archived/`; this was the stale claim they left
behind."* `CLAUDE.md` now agrees with `PRODUCTION-OPS.md` and `ARCHITECTURE.md`.

The code was also read incompletely the first time: `backend/src/lib/ai/
gateway.ts`'s **fallback default** for `ollamaBaseUrl` is `http://127.0.0.1:11434`
(used only when the `OLLAMA_BASE_URL` env var is unset), and the comments
around it ("Desktop-first, local-only") are genuinely stale wording — but the
**actual deployed configuration is not that fallback**. `compose.yaml` sets
`OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://ollama:11434}` (dev) and
`compose.prod.yaml` sets `http://esti-ollama:11434` (prod) — both the Docker-
Compose service hostname for the shared `ollama` container `CLAUDE.md`
describes, reachable from the backend container over the compose network.
**The architecture works as `CLAUDE.md`/`PRODUCTION-OPS.md` now describe it**:
one shared, self-hosted Ollama instance per deployment, called server-side —
not a per-user desktop model, and not currently broken.

**What's left, now narrower than originally claimed:**
- `gateway.ts`'s comments (*"Desktop-first, local-only... There is no
  external/cloud provider"*) and `ai.router.ts`'s (*"Local-only AI: no secret
  to redact," "Local-first AI is unmetered"*) are stale wording — accurate
  about there being no external API, misleading about "desktop"/"local" when
  the real shape is "one shared server-side container per deployment." Worth
  a comment fix when this code is next touched; not a functional bug.
- `ARCHITECTURE.md`'s "provider TBD per deployment" is itself now slightly
  behind `CLAUDE.md`'s more specific "self-hosted Ollama container" answer —
  minor, not contradictory, not chased further here.
- The provider-strategy question this section originally posed as urgent
  (hosted LLM API vs. self-hosted) **is already answered**: self-hosted Ollama,
  per-deployment, server-reachable. Nothing here blocks Phase 7 implementation
  on an unresolved architecture question the way the original write-up implied.

---

## What's real and portable regardless of how the provider question resolves

Underneath the provider question, there's a genuinely substantial retrieval/
audit/workflow layer that doesn't depend on which LLM answers the prompt:

| | Current | Target |
| --- | --- | --- |
| Run provenance table | `esti_ai_run` (`backend/src/db/schema/ai.ts`) — every generation is recorded: who, when, what kind, which provider/model, a prompt summary, structured `sources` (jsonb — what data justified the answer), the output text, and an approval-gate `approvalState` (`DRAFT` → presumably `ISSUED`, which the code confirms locks further edits: *"Issued AI draft is locked"*) | Direct port. This table is the actual compliance-relevant piece of the whole feature — `ARCHITECTURE.md`'s AI Boundary principle ("prompts and outputs are auditable... output remains a draft until a human issues it") is enforced by this table's shape, not by the provider choice |
| Context assembly | `assembleAiContext()` (`backend/src/lib/ai/context.ts`) — permission-filtered retrieval pulling from `getActionCenter()` (Phase 5's dashboard read model), `loadOperatorSnapshot()`/`formatOperatorSnapshot()` (`operator-context.ts`, 450 lines — not read in depth here), `loadPublishedRepoKnowledge()` (`repo-knowledge.ts` — reads from whatever `esti_repo_source` actually is, the same table Phase 6's audit flagged as possibly-dead/unconfirmed), plus a generated static knowledge bundle (`wiki-knowledge.generated.js`) and a fixed system prompt (`AORMS_OPERATOR_SYSTEM`/`AGENT_ANSWER_RULES`, `aorms-operator.ts`) | This is the piece worth the most implementation-time investment regardless of the provider decision — it's what makes ESTI answer *from this firm's own data* rather than being a generic chatbot, which is the actual product value. Port the retrieval functions as Supabase queries respecting RLS (the current system's "permission filtered" claim in `ARCHITECTURE.md` should mean this retrieval already respects `can(role, ...)` checks — confirm that's true today, not assumed, before treating it as already correct) |
| PII redaction | `redactPii()` (`backend/src/lib/ai/redact.ts`) — four regex patterns (email, Indian mobile number, PAN, GSTIN), applied to output before storage when `settings.redactPii` is on | Pure function, 8 lines, port verbatim |
| Draft-vs-agent modes | `mode: "draft" | "agent"` — a document draft (`AI Studio`, requires `write` capability) vs. a read-only Q&A agent (any authenticated user, "ESTI agent (Alt+A)" per the settings query's comment) — two different capability gates on the same `generate` mutation | Port both modes' distinct gate as two paths in the Server Action (or two Server Actions); don't collapse them, the capability check genuinely differs (`can(role, "write")` required for drafts, not for agent Q&A) |
| Fallback behavior | On an Ollama call failure, `runAiGateway()` doesn't error out to the user — it falls back to `generateMockOutput()` and appends a visible `*Ollama fallback (‹error›)*` note to the output | Worth preserving the "always return something, be honest about the fallback" pattern regardless of what the real provider ends up being — a cloud LLM API can fail too (rate limit, outage), and degrading to a template rather than a hard error is a reasonable UX choice already made here |
| Mock/template provider | `generateMockOutput()`/`buildTemplateDraft()` (`templates.ts`) — a deterministic, non-LLM fallback that still produces a usable draft from structured project/billing/decision data | Port as-is; useful both as the actual fallback and as a "does the retrieval pipeline work" smoke-test path independent of any LLM being configured at all — a good first slice to implement and verify before wiring a real provider |

---

## Licensing/plan gating — same out-of-scope system Phase 2 already decided on

`aiRouter.setSettings`/`generate` both call `assertPlanFeature(db, "ai")`
(`backend/src/lib/plan.ts`) — AI is a Core+-only feature per the seat/plan
licensing system, which resolves its effective plan from a **signed license
token** tied to `ESTI_HUB_URL`, the same central licensing-platform concept
the [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) already decided is out
of scope for the single-tenant-per-deployment Supabase model ("no `org_id`
anywhere... RLS scoped by `auth.uid()` + role only"). **Consistent with that
earlier decision**: this phase should drop the plan-tier gate entirely (every
deployment is its own single-tenant instance now, there's no multi-plan
licensing concept in the target architecture) rather than port
`assertPlanFeature` forward. Confirms the Phase 2 decision was the right call
to make early — a second phase, independently, would have needed it too.

---

## Demo-mode gating

`demoBlocksAiDraft()`/`demoBlocksAiSettings()` (`backend/src/lib/demo-policy.ts`,
not opened in depth here) block AI draft generation and settings changes for
demo-workspace users. Same category as Phase 5's `applyIntervention` finding —
a demo-environment-only concern with no obvious Supabase-project equivalent
yet (no `isDemo` column exists on Phase 2's `profiles` table). **Recommend the
same treatment Phase 5 gave `applyIntervention`**: don't port this in Phase 7
unless a specific demo/staging Supabase project is planned that needs it;
note the decision rather than silently dropping it.

---

## Not audited in depth — flagged for whoever implements

- **`operator-context.ts` (450 lines)** and **`repo-knowledge.ts`** — the two
  largest pieces of the actual retrieval logic, only referenced by name here,
  not read line-by-line. `repo-knowledge.ts` reads from `esti_repo_source`,
  which the [Phase 8 audit](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) confirms is
  live (owned by the `knowledgeBankPortal` namespace) — `loadPublishedRepoKnowledge()`
  does have something real to port, sequence it after Phase 8's Knowledge
  Bank Portal domain lands.
- **`wiki-knowledge.generated.js`** — a generated static bundle (per
  `CLAUDE.md`'s note on rebuilding "the AI wiki index" when wiki content
  changes). Confirm the generation pipeline (what generates it, when) before
  assuming it's just another static asset to copy over.
- **`assembleCpiReportContext()`** (seen in `context.ts`'s CPI_REPORT handling)
  — ties to a `cpi` tRPC namespace (Client Intelligence Report generation)
  that no phase 2–6 audit has covered. Another small roadmap-gap sibling to
  Phase 6's HR/Payroll and Delivery findings — flagged, not resolved.
- **`MOM_REVISION_MAX_SUGGESTIONS`** (imported from `@esti/contracts` into
  `context.ts`) implies AI-assisted MOM (meeting minutes) revision suggestions
  — a specific `AiDraftKind` not enumerated or explored here.
- **`@hcw/aorms-ai-kit`'s `callOllamaChat()`** — the actual Ollama HTTP client.
  `CLAUDE.md` describes this package as "prompts + Ollama SDK for local/desktop
  use," which is consistent with the *archived* pre-pivot framing, not the
  office-hub framing `PRODUCTION-OPS.md` describes. If the provider question
  resolves toward a hosted LLM API, this package's role shrinks to (at most)
  the prompt-template half, or gets replaced outright for the transport half.

---

## Suggested Phase 7 approach

Given the central finding above, this phase doesn't have a normal "landing
order of tables" the way Phases 2–5 did — but unlike Phase 6, the provider
question that used to gate everything here is already answered (self-hosted
Ollama, per-deployment, server-reachable — see the corrected central finding
above), so this is a normal small-phase sequence, not a blocked one:

1. **Decide whether to port a self-hosted Ollama container into the target
   Hostinger deployment**, or reuse Phase 6's hosting-topology decision if a
   persistent-process answer already exists there — this is now the only real
   open infra question, and it's Phase 6's question, not a new one.
2. **Port `esti_ai_run` + the approval-gate workflow** — works under the mock
   provider alone, no dependency on #1's answer, and is the actual
   compliance/audit backbone `ARCHITECTURE.md` cares about.
3. **Port `redactPii()` and the mock/template provider** — both trivial, both
   provider-independent, both useful as a working end-to-end smoke test before
   any real LLM is wired in.
4. **Drop the plan/licensing gate** (`assertPlanFeature`) per the Phase
   2-consistent decision above; decide on demo-mode gating per the Phase
   5-consistent recommendation above.
5. **Port the retrieval layer** (`assembleAiContext`, `operator-context.ts`,
   `repo-knowledge.ts`) as Supabase queries — this is the phase's real
   implementation weight; the repo-knowledge slice should sequence after
   [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)'s Knowledge Bank Portal
   domain (`esti_repo_source`'s owning feature) lands.
6. **Wire the resolved provider** from step 1 last, once everything else
   already works against the mock/template path.

---

## What this audit deliberately did not cover

- **`operator-context.ts`, `repo-knowledge.ts`, `aorms-operator.ts`,
  `wiki-knowledge.generated.js`** — named and roughly characterized, not read
  line-by-line.
- **The `cpi` (Client Intelligence Report) namespace** — now covered by
  [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md), including the finding that
  its `generateReport` mutation calls this phase's `runAiGateway()` directly
  and is blocked on the same provider decision.
- **`@hcw/aorms-ai-kit`'s actual contents** beyond `callOllamaChat()`'s call
  signature — not opened.
- **Whether `assembleAiContext()`'s retrieval genuinely respects
  `can(role, ...)` permission checks today**, as `ARCHITECTURE.md` claims —
  asserted from the doc, not verified against the actual query code.

This closes the Phase 2–7 audit sequence started for the Next.js/Supabase
migration. See [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) § Stack migration for
the full list and current status of all six audits.
