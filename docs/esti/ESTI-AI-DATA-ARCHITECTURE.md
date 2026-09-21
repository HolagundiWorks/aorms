# AORMS Data / Drive / Esti AI Architecture

**Status: FROZEN ARCHITECTURE (2026-09-21).** This is the canonical
reference for how AORMS structured data, Google Drive documents, and the
Esti AI layer relate to each other. Do not redesign this architecture
without explicit approval.

**Supersedes, as of this date:**
- [DATABASE-PER-TENANT-ARCHITECTURE.md](DATABASE-PER-TENANT-ARCHITECTURE.md)
  in full — that doc's direction (one dedicated Supabase project per
  Studio) is reversed. **One shared `aorms-web` Supabase project, RLS-isolated
  by `firm_id`, is the standing model**, not a stepping-stone to per-tenant
  databases. Kept in the repo as a historical record of that explored and
  abandoned direction, not as live guidance.
- [AORMS-V2-DEVELOPER-GUIDELINES.md](AORMS-V2-DEVELOPER-GUIDELINES.md)'s
  §§ 7–11 (Google Drive is the document repository / folder mapping /
  database architecture / tenant isolation / customer-owned-database
  option) and § 29/§ 31 (data-ownership principle / product modes), which
  described a customer-can-bring-their-own-Drive/DB/AI model. **AORMS now
  runs one AORMS-managed Supabase project and one AORMS-managed Google
  Drive structure per firm** — no BYO-database or BYO-Drive mode. That
  doc's other sections (§§ 1–6, 12–28, 30, 32–33 — identity, modular
  monolith, AI-provider abstraction, WhatsApp, events, workflow engine,
  RAG split, non-negotiable dev rules) are **not** superseded and remain
  in force; this doc does not repeat them.

## 0. Terminology: `firm`, not `company`

AORMS's actual multi-tenancy unit is the **firm** (`public.firms`,
`firm_id`, `current_firm_id()` — shipped live 2026-09-19, see CLAUDE.md's
multi-tenancy history). Every table and diagram below uses `firm_id`
accordingly. Do not introduce a `company_id` tenant column or a
`companies` table for this purpose — **`companies` is already a distinct,
shipped concept**: material-supplier business entities on the ConnectDeX
portal (`AORMS-C-` handles — see
[AORMS-PLATFORM-ARCHITECTURE.md](AORMS-PLATFORM-ARCHITECTURE.md)). Reusing
the word for the tenant/firm concept here would collide with that and
confuse anyone reading both docs.

## 1. Core principles

1. **Supabase is the source of truth for structured AORMS data.**
2. **Google Drive is the firm's document/export repository.**
3. **Esti is a closed-domain AI layer** that reasons only over data AORMS
   retrieves for it — never a general-purpose chatbot, never given direct
   database or internet access.

```text
                         AORMS
                           │
             ┌─────────────┼─────────────┐
             │             │             │
         Next.js       Android App    Esti AI
             │             │             │
             └─────────────┼─────────────┘
                           │
                      AORMS API Layer
                           │
                ┌──────────┴──────────┐
                │                     │
             Supabase             Google Drive
           Source of Truth       File Repository
                │                     │
          Structured data        PDFs / XLSX
          BOQ / Specs             CSV / DOCX
          Projects                Drawings
          Tasks                   Images
          Finance                 Exports
                │
                └──────────┐
                           │
                       Esti RAG
                           │
                       AI Provider
```

Supabase RLS enforces `firm_id`-scoped access on every exposed table,
combined with appropriate grants (Supabase's own guidance:
[securing your API](https://supabase.com/docs/guides/api/securing-your-api)).

## 2. Database architecture — one shared project, RLS-isolated

Use the one production Supabase project (`aorms-web`). Do not create a
separate Supabase project per firm (see supersession note above). Every
firm-owned business table carries:

```text
firm_id UUID NOT NULL references public.firms (id)
created_at, updated_at, created_by, updated_by
```

RLS policies gate on `firm_id = current_firm_id()`, per CLAUDE.md's
multi-tenancy sweep — every one of the ~90 tenant tables already follows
this. New tables must too. Use UUID primary keys.

```text
firms
    │
    ├── profiles / profile_firm_memberships
    ├── clients
    ├── contractors / third parties
    ├── project_offices
    ├── boq / specification tables
    ├── meetings
    ├── tasks
    ├── accounts / invoices
    └── ...
```

## 3. Core hierarchy

```text
Firm
  │
  ├── Users (profiles, via profile_firm_memberships)
  │
  ├── Clients
  │
  ├── Third Parties (contractors, consultants)
  │
  ├── Project Offices
  │     │
  │     ├── Documents
  │     ├── BOQ / Estimates
  │     ├── Specifications
  │     ├── Measurements
  │     ├── Tasks
  │     ├── Meetings
  │     ├── Approvals
  │     ├── Tenders
  │     └── Accounts
  │
  └── Knowledge Bank
```

## 4. Document register

Because users should not have to re-upload documents to compare
revisions, every document lives in a central register, not just a Drive
file. This extends the `documents` shape AORMS-V2-DEVELOPER-GUIDELINES.md
§ 7 already defined (kept, not superseded) with the revision model below:

```text
documents
  id, firm_id, project_id, document_no, document_type, title,
  discipline, current_revision_id, status, created_at, created_by
```

Example:

```text
Document No: AORMS-ARC-001
Title: Architectural BOQ
Type: BOQ
Project: Villa Project
Current Revision: R04
Status: Current
```

## 5. Revision architecture

Never overwrite an existing revision. A revision is immutable once
approved — a change becomes a new revision (`R05`), not an edit to `R04`.

```text
documents
    │
    ├── revision R00
    ├── revision R01
    ├── revision R02
    ├── revision R03
    └── revision R04
```

```text
document_revisions
  id, document_id, revision_no, revision_date, revision_description,
  revision_status, created_by, created_at
```

## 6. BOQ structure

BOQ data lives entirely in PostgreSQL — a BOQ revision must be queryable
without opening a PDF.

```text
boq_documents
    │
    └── boq_revisions
            │
            └── boq_items
                    │
                    ├── item_no
                    ├── description
                    ├── specification_id
                    ├── uom
                    ├── quantity
                    ├── rate
                    ├── amount
                    └── ...
```

Example:

```text
BOQ-001 / R03
Item 145 — Flooring — UOM m² — Quantity 8,420 — Rate ₹1,850 — Amount ₹15,577,000
```

## 7. Specifications

Structured, not PDF-primary:

```text
specifications
    │
    ├── specification_sections
    ├── specification_items
    └── specification_revisions

specification_id, section, clause, description, material, workmanship,
standard_reference, revision_id
```

This lets Esti answer "Which specification applies to BOQ item 145?" by
querying the database, not by reading a document.

## 8. BOQ comparison — deterministic, not AI-calculated

Comparison happens in application code before the AI ever sees it:

```text
User: Compare BOQ-001 R03 and R04
        ↓
     Esti API
        ↓
     Supabase
        ↓
Deterministic comparison engine
        ↓
Added items · Deleted items · Quantity changes · Rate changes ·
Amount changes · Specification changes
        ↓
Evidence package
        ↓
AI Provider
        ↓
Explanation
```

The AI explains the comparison; it does not calculate it. E.g. the
application computes `R04 quantity 8,420 − R03 quantity 8,120 = +300
(+3.69%)` and hands that number to the AI as a fact, not a question.

## 9. Google Drive architecture

Google Drive is the firm's file repository, not the AORMS database. Use
Google OAuth (never store a user's Google password) — files created
under a user's OAuth credentials are owned by that user, and Google
Workspace customers can use Shared Drives for organizational collaboration
([Drive API: create a file](https://developers.google.com/workspace/drive/api/guides/create-file)).

```text
Google Drive
└── AORMS
    └── Firm
        ├── Projects
        │   ├── Project-001
        │   │   ├── Exports
        │   │   ├── Drawings
        │   │   ├── Images
        │   │   └── Reports
        │   │
        │   └── Project-002
        │
        ├── Firm Documents
        └── Archive
```

Per AORMS-V2-DEVELOPER-GUIDELINES.md § 8 (kept): support both this
AORMS-created structure and mapping onto a firm's existing Drive
structure — do not force a firm to reorganize.

## 10. Store Drive references in Supabase

Never depend on filename alone. This extends the `documents` table (§ 4)
with the provider linkage:

```text
drive_files
  id, firm_id, project_id, document_id, revision_id, drive_file_id,
  drive_folder_id, file_name, mime_type, file_size, web_url, created_at
```

The Drive file ID is the canonical external reference — retrieve specific
file metadata through Drive's `files` resource rather than reconstructing
files from names
([Drive API: create a file](https://developers.google.com/workspace/drive/api/guides/create-file)).

## 11. Export workflow

```text
Supabase → Retrieve data → Generate PDF → Upload to Drive →
Receive Drive file ID → Save Drive metadata in Supabase → Return link
```

Same for CSV, XLSX, DOCX, reports, tender documents. The generated file
is never the source of truth — the database remains authoritative.

## 12. Never use filenames as identifiers

Bad: `BOQ Final Final 2.xlsx`. Good: `Document No: AORMS-BOQ-001`,
`Revision: R04`, `Database ID: UUID`, `Drive ID: <google drive id>`. The
UI displays `AORMS-BOQ-001 / R04`, not the raw filename.

## 13. Google authentication

```text
AORMS Login → Google OAuth → Drive authorization →
Store encrypted OAuth credentials/tokens
```

Do not use a global service account for all firms' Drive files — a
service account owns files it creates, not the firm
([Drive API: create a file](https://developers.google.com/workspace/drive/api/guides/create-file)).
Design Shared Drive permissions separately for Workspace customers.

## 14. Esti architecture — closed domain

Esti must not be a generic chatbot interface:

```text
                    ESTI
                     │
                Domain Gate
                     │
          ┌──────────┴──────────┐
          │                     │
      AORMS Query            Non-AORMS
          │                     │
          ▼                     ▼
     Retrieval              BLOCK
          │
          ▼
      Evidence
          │
          ▼
     AI Provider
          │
          ▼
     Validation
          │
          ▼
       Answer
```

This composes with, rather than replaces, AORMS-V2-DEVELOPER-GUIDELINES.md
§ 15's retrieval-vs-action distinction (kept) — retrieval questions flow
through the Domain Gate above; actions still require the separate
permission/confirmation path that section already defines.

## 15. No internet access

Do not enable an AI provider's web-search tool for Esti. Expose only the
AORMS function/tool set you define (see § 16) — provider APIs that
support optional tools (web search, custom function calling) must have
anything beyond the AORMS toolset explicitly disabled, not just unused.

Esti must not answer "What's the weather today?", "What is the latest
cement price?", "Who is the president?", "What happened in the news?"
unless that information has been explicitly imported into an approved
AORMS knowledge source (§ 26). Expected response: *"Outside AORMS scope.
I can only answer using information available in your AORMS workspace."*

## 16. Esti's allowed tools

Expose a small, controlled toolset — e.g. `get_project`,
`get_project_status`, `get_project_team`, `get_client`, `get_boq`,
`get_boq_revision`, `compare_boq_revisions`, `get_specification`,
`search_specification`, `get_measurements`, `get_tasks`, `get_meetings`,
`get_meeting_minutes`, `get_approvals`, `get_document`,
`get_document_revision`, `search_knowledge`.

Never expose `execute_sql`, `browse_web`, `fetch_url`, `search_google`,
`search_news`, `general_search`, or any other unconstrained tool.

## 17. Database security

Every query is tenant-aware: `firm_id = authenticated_user's current firm`
(via `current_firm_id()`), resolved server-side, never trusted from the
browser (`firm_id`/`project_id`/`user_id` in a request body are inputs to
validate, not facts to act on). Supabase's guidance: RLS plus appropriate
grants; service-role/secret keys bypass RLS and must never reach frontend
code
([RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)).

Frontend: Supabase publishable key only. Backend only: Supabase
secret/service key, AI provider API key(s), Google OAuth credentials.
Never put these in Next.js client components, the Android APK, browser
JavaScript, or GitHub.

## 18. Esti retrieval

For "Compare BOQ-001 R03 and R04", Esti produces an internal, backend-
validated retrieval request:

```json
{
  "intent": "compare_boq",
  "project_id": "...",
  "document_no": "BOQ-001",
  "revision_a": "R03",
  "revision_b": "R04"
}
```

then: `Supabase → R03 data + R04 data → Comparison engine → Evidence Pack`.

## 19. Evidence Pack

The most important part of this design. Before calling the AI provider,
construct a scoped evidence pack — the AI receives this, never the whole
database:

```json
{
  "scope": {
    "firm_id": "...",
    "project_id": "...",
    "document_no": "BOQ-001",
    "revisions": ["R03", "R04"]
  },
  "facts": [
    { "source": "BOQ-001/R03/ITEM-145", "quantity": 8120, "uom": "m2" },
    { "source": "BOQ-001/R04/ITEM-145", "quantity": 8420, "uom": "m2" }
  ],
  "calculations": [
    { "name": "quantity_difference", "value": 300 },
    { "name": "percentage_difference", "value": 3.69 }
  ]
}
```

## 20. AI provider boundary

One internal interface — this is the same abstraction
AORMS-V2-DEVELOPER-GUIDELINES.md § 12 already established
(`AIProvider { chat(), embed(), transcribe(), vision() }`); this doc
names the concrete Esti-facing wrapper `EstiAIProvider` and does not
introduce a second, competing interface:

```text
EstiAIProvider
       │
       ├── OllamaProvider   (current production default — self-hosted,
       │                     see PRODUCTION-OPS.md § ESTI AI)
       ├── OpenAIProvider   (OpenAI-compatible; optional)
       └── (future: AORMS AI, customer-supplied endpoint)
```

AORMS is not built around any one provider's specific logic — it is
built around Esti's own AI interface. Call the provider server-side only,
never from the browser.

## 21. Force structured AI responses

Don't accept uncontrolled prose. Require a structured shape, e.g.:

```json
{
  "status": "SUPPORTED",
  "answer": "...",
  "claims": [
    {
      "text": "...",
      "source_ids": ["BOQ-001/R03/ITEM-145", "BOQ-001/R04/ITEM-145"]
    }
  ]
}
```

Use JSON-schema/structured-output support where the chosen provider
offers it (e.g. OpenAI's structured outputs) so the response conforms to
a schema you define, rather than trusting free-form prose to parse.

## 22. Hallucination protection — four independent controls

1. **Domain gate** — reject non-AORMS questions (§ 15).
2. **Retrieval gate** — no evidence, no answer.
3. **Source attribution** — every factual claim carries source IDs.
4. **Response validation** — extract claims from the AI response, match
   each against the evidence pack; an unsupported claim is rejected/
   regenerated, not delivered.

```text
AI response → Extract claims → Match against evidence →
Unsupported claim? → YES: reject/regenerate · NO: deliver
```

Stronger than a "don't hallucinate" system-prompt instruction alone.

## 23. Calculations never depend on AI

Quantity, rate, amount, tax, fee, variance, percentage change, BOQ
totals, project totals, budget, actual, outstanding, days overdue — all
application/database logic. The AI explains the number; it never
produces it:

```text
CODE → ₹15,577,000 → AI → "R04 represents a 3.69% increase..."
```

Never: `AI → ₹15,577,000`.

## 24. Esti response states

```text
ANSWERED · SUPPORTED · PARTIALLY_SUPPORTED · INSUFFICIENT_DATA ·
OUTSIDE_SCOPE · UNAUTHORIZED · ERROR
```

Examples — no data: *"Insufficient AORMS data. I couldn't find the
requested information in the current project records."* Outside scope:
*"Outside AORMS scope. I can only answer using information available in
your AORMS workspace."* Unauthorized: *"You don't have access to this
project information."* Prefer these fixed states over letting the model
improvise its own refusal wording.

## 25. Knowledge Bank

Another controlled AORMS source, not a free-for-all:

```text
knowledge_sources
  id, firm_id, title, source_type, status, version, approved_by, approved_at
```

Possible sources: firm standards, office SOPs, approved specifications,
approved code references, tender rules, internal rate books, templates,
methodologies. Only `status = APPROVED` rows are available to Esti.

## 26. Google Drive does not automatically become RAG

Do **not** wire "everything in Google Drive" straight into Esti's
knowledge. A random PDF sitting in someone's Drive is not automatically
truth for Esti:

```text
Google Drive → AORMS registration → Approved/indexed? →
YES → Knowledge pipeline → Esti
```

This is the concrete version of AORMS-V2-DEVELOPER-GUIDELINES.md § 28's
RAG split (structured queries for tasks/projects/dates/people/budgets/
status; pgvector RAG for drawings/transcripts/specs/contracts/knowledge
documents) — kept, not replaced.

## 27. Recommended final architecture

```text
                         AORMS
                           │
                    ┌──────┴──────┐
                    │             │
                 Next.js       Android
                    │             │
                    └──────┬──────┘
                           │
                      AORMS API
                           │
             ┌─────────────┼─────────────┐
             │             │             │
         Supabase      Drive API       Esti
             │             │             │
             │             │       Domain Gate
             │             │             │
             │             │       Retrieval
             │             │             │
             │             │       Evidence
             │             │             │
             │             │      AI Provider
             │             │             │
             │             │       Validator
             │             │             │
             └─────────────┴─────────────┘
                           │
                     AORMS Source
                       of Truth
```

## 28. The non-negotiable rule

**The AI never owns AORMS data. The AI never decides what data it is
allowed to see. The AI never retrieves data directly.** AORMS retrieves
authorized evidence first, then gives that evidence to the AI for
interpretation. This is what keeps the provider swap-able — today
`Esti → Ollama` in production, optionally `Esti → OpenAI-compatible API`,
later `Esti → a customer's own AI endpoint` — without redesigning the
AORMS database or Drive architecture.
