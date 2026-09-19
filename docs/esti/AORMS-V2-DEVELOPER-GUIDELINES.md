# AORMS V2 — Developer Guidelines

**Status: FROZEN ARCHITECTURE** (2026-09-20). This is the canonical
architecture reference for the direction started in
[LIGHTWEIGHT-ARCHITECTURE-PLAN.md](LIGHTWEIGHT-ARCHITECTURE-PLAN.md) —
that doc tracks phase-by-phase build status against this spec, and is
kept in sync with it rather than duplicating its content. Do not redesign
this architecture without explicit approval.

## 1. Core product principle

AORMS is an Architecture Practice Operating System, not simply an ERP.

> AORMS orchestrates the practice; the customer owns its data, documents,
> AI and infrastructure.

```
Customer
├── Google Identity
├── Google Drive
├── Database
├── AI
└── Optional Desktop Compute

                    ↓

                 AORMS
├── ERP
├── Workflow Engine
├── Automation
├── Esti
├── Integrations
├── Audit
└── User Interface
```

## 2. Frozen technology direction

| Layer | Choice |
| --- | --- |
| Application | Next.js, TypeScript, Carbon Design System |
| Hosting | Hostinger |
| Core database | Supabase / PostgreSQL |
| Authentication | Supabase Auth, Google OAuth |
| Documents | Google Drive |
| AI | Customer AI API, OpenAI-compatible APIs, Ollama, AORMS AI |
| Local compute | AORMS Desktop Agent |
| External communication | WhatsApp API |
| Automation | AORMS internal event + workflow engine |
| Vector/RAG | PostgreSQL + pgvector initially — no separate vector database unless scale demonstrates a requirement |

## 3. Do NOT introduce unnecessary infrastructure

Out of scope for the current architecture: Kubernetes, Kafka, RabbitMQ,
Redis, a dedicated vector database, dedicated object storage,
microservice architecture, a separate API gateway, a separate workflow
SaaS, dedicated AI infrastructure. Use the existing Next.js / Supabase /
Edge Functions / Postgres / Google Drive / Desktop Agent stack wherever
practical.

## 4. Architecture style

Modular monolith. Do NOT create separate deployable services for every
module.

```
src/
├── app/
│
├── core/
│   ├── auth/
│   ├── tenants/
│   ├── permissions/
│   ├── events/
│   ├── workflows/
│   ├── audit/
│   └── security/
│
├── modules/
│   ├── projects/
│   ├── tasks/
│   ├── meetings/
│   ├── sites/
│   ├── third-parties/
│   ├── accounts/
│   ├── hr/
│   ├── tenders/
│   ├── knowledge/
│   └── documents/
│
├── integrations/
│   ├── google/
│   │   ├── auth/
│   │   └── drive/
│   ├── whatsapp/
│   ├── ai/
│   │   ├── openai-compatible/
│   │   ├── ollama/
│   │   └── aorms/
│   └── desktop/
│
└── services/
    ├── ai/
    ├── workflow/
    ├── documents/
    ├── notifications/
    └── imports/
```

Names can be adapted to the existing codebase (`web/lib/`, `web/app/`),
but the separation of responsibilities must remain.

## 5. Identity architecture

Google is the default identity provider.

```
Continue with Google → Google OAuth → Supabase Auth → AORMS User → Create / Join Practice
```

Do not create an independent username/password system for normal users
unless there is a documented requirement.

## 6. Google Drive onboarding

Google Drive is part of the onboarding flow:

```
Continue with Google → Create / Join Practice → Connect Google Drive →
Create / select AORMS Drive location → AORMS ready
```

Keep **authentication** (identity) separate from **Drive authorization**
(document access) internally, even if the UI presents them as one
continuous onboarding flow. Do not request unnecessarily broad Drive
permissions.

## 7. Google Drive is the document repository

Do not make Supabase Storage the default document repository. AORMS
stores metadata only: file ID, folder ID, project ID, file name, mime
type, revision, version, metadata, permissions/status, timestamps.

```
documents
  id, company_id, project_id, provider, provider_file_id,
  provider_folder_id, name, mime_type, document_type, revision, version,
  created_by, created_at, updated_at, ai_indexed, status
```

Do not duplicate large PDFs/images unnecessarily.

## 8. Google Drive folder mapping

Support both an AORMS-created structure (`AORMS/Projects/`, `Clients/`,
`Consultants/`, `Tenders/`, `Accounts/`, `HR/`, `Knowledge/`) and mapping
onto an existing customer structure (Project Documents → existing
folder, etc.) — administrator-configurable. Do not force firms to
reorganize their existing Drive.

## 9. Database architecture

Supabase/Postgres remains the default AORMS relational database. Core
tables: `companies`, `users`, `company_members`, `roles`, `permissions`,
`projects`, `project_phases`, `tasks`, `meetings`, `meeting_actions`,
`clients`, `third_parties`, `sites`, `tenders`, `vendors`, `accounts`,
`employees`, `documents`, `document_versions`, `workflows`,
`workflow_steps`, `workflow_runs`, `workflow_run_steps`, `events`,
`notifications`, `audit_logs`, `ai_providers`, `connectors`,
`desktop_agents`. All company-owned records must be tenant-aware.

## 10. Tenant isolation

Every business record must be associated with a `company_id`. Do not
rely on frontend filtering. Enforce isolation using Supabase RLS +
server-side authorization + application permission checks. A user must
never be able to access another company's records by manipulating IDs or
API requests.

## 11. Customer-owned database option

Three deployment/data modes:

- **Mode A — AORMS managed**: AORMS → Supabase
- **Mode B — Customer Supabase**: AORMS → Customer Supabase
- **Mode C — Customer API**: AORMS → Customer API → Customer DB

Do not implement arbitrary direct database connections from browser
code. External databases go through controlled server-side connectors or
customer APIs.

## 12. AI architecture

Never hard-code Esti to one AI provider.

```ts
interface AIProvider {
  chat()
  embed()
  transcribe()
  vision()
}
```

Providers: AORMS AI, OpenAI-compatible API, Ollama, Customer AI endpoint.
The application must not contain provider-specific logic throughout
individual modules — route through an AI Gateway to the selected
provider.

## 13. AI data policy

The user/company must be able to configure: AI provider, document
access, project-data access, embedding provider, transcription provider,
external AI permission, AI write permissions.

> Default principle: AI receives only the minimum data required for the
> requested operation. Never send an entire company's database to an AI
> model.

## 14. Esti architecture

Esti is the intelligence/orchestration layer, not the database. Esti
uses AORMS tools:

```
Esti → Tool Layer → get_project() / get_tasks() / search_documents() /
get_project_history() / create_task() / create_minutes()
```

Do not give the LLM unrestricted SQL/database access.

## 15. Esti must distinguish retrieval from action

- **Retrieval** ("What changed in Project X?") — Esti retrieves information.
- **Action** ("Create follow-up tasks.") — Esti requests an AORMS action.

Sensitive actions require permission and, where appropriate,
confirmation.

## 16. External users are NOT normal AORMS users by default

Do not create a mandatory portal/login for every client, consultant,
vendor, contractor, or site contact. Support WhatsApp, secure web links,
Google authentication, optional portal access instead. Internal staff
remain the primary AORMS application users.

## 17. WhatsApp architecture

WhatsApp is a channel, not the system of record.

```
WhatsApp → WhatsApp Connector → AORMS Event / Workflow → Postgres
```

Example: client replies "Approved" → `approval.completed` event →
project DB updated, task completed, audit created, architect notified.
Never store critical workflow state only in WhatsApp messages.

## 18. External identity

Associate external participants via a registered contact record
(`third_parties`: id, company_id, name, organization, role, phone,
whatsapp_phone, email) — but do not treat a phone number alone as
authorization. Use verified channel + contact record + project
relationship + permission together. Sensitive operations may require a
secure web link or additional verification.

## 19. Secure web links

```
AORMS → Generate secure token → WhatsApp → Client clicks → Secure web page
```

Examples: approve drawing, view document, submit comment, confirm
meeting, view invoice, respond to request. Use short-lived tokens,
scoped permissions, audit logging, no exposure of unrelated project
data.

## 20. Event architecture

```
events
  id, company_id, event_type, entity_type, entity_id, payload, status,
  created_at, processed_at
```

## 21. Important event types

Start with: `project.created`, `project.updated`, `task.created`,
`task.assigned`, `task.completed`, `task.overdue`, `meeting.created`,
`meeting.completed`, `document.uploaded`, `document.updated`,
`approval.requested`, `approval.completed`, `approval.rejected`,
`tender.created`, `tender.submitted`, `invoice.created`,
`invoice.approved`, `site_issue.created`, `employee.absent`. Do not
create events for every trivial UI interaction — events represent
meaningful business changes.

## 22. Workflow engine

```
Trigger → Condition → Action → Optional approval → Next step
```

Workflow definitions live in Postgres: `workflow`, `workflow_steps`,
`workflow_runs`, `workflow_run_steps`. Initial step types: `trigger`,
`condition`, `action`, `delay`, `approval`, `notification`, `AI`.

## 23. Initial automations

- **Project created** → Drive folder → project phases → default tasks → checklist
- **Meeting completed** → transcript → minutes → decisions → tasks
- **Approval requested** → WhatsApp notification → secure link → response → project update
- **Task overdue** → notification → escalation → follow-up
- **Drive document added** → metadata → project association → optional AI indexing
- **Site issue** → Drive photo → issue record → task → responsible person

## 24. Workflow execution

Never make long-running workflows block a browser request.

```
Create job → Queue/event → Worker/function → Execute → Record result
```

Use Supabase/Postgres mechanisms initially. Do not introduce
Redis/Kafka merely for workflow execution.

## 25. Audit everything important

Immutable-style audit trail for: login, permission change, document
access, document sharing, AI action, workflow execution, approval,
financial modification, project status change, external communication,
connector change. Audit record: actor, company, action, entity,
timestamp, source, result.

## 26. Desktop Agent

Optional. Outbound-only connection:

```
AORMS ← secure outbound connection ← Desktop Agent
                                        ├── Ollama
                                        ├── Whisper
                                        ├── Local files
                                        ├── PDF tools
                                        ├── AutoCAD
                                        └── Revit
```

The desktop establishes the connection outbound. Do not require users to
expose their desktop/Ollama server directly to the internet.

## 27. Desktop Agent permissions

Capabilities must be explicit (AI inference ✓, read local files ✓, write
local files □, AutoCAD execution □, Revit execution □, shell execution
□ by default). Never provide unrestricted shell execution by default.
Every desktop operation should be auditable.

## 28. RAG architecture

Structured data → PostgreSQL. Knowledge → pgvector. Do not vectorize
everything — use structured queries for tasks/projects/dates/people/
budgets/status, RAG for drawings/meeting transcripts/specifications/
contracts/knowledge documents/historical reports.

```
Question → Intent → SQL/data query
                  └→ RAG query → Combined context → Esti
```

## 29. Data ownership principle

- **Customer-owned**: documents, database, AI, Drive, project information, knowledge
- **AORMS-controlled**: application configuration, workflow definitions, connector configuration, audit metadata, subscription

Document this distinction clearly in the product.

## 30. Self-hosting/open-source direction

Keep provider interfaces clean so an **AORMS OSS** core can run with a
customer DB, customer Drive, Ollama, and customer infrastructure, while
**AORMS Cloud** provides managed operation. Do not introduce SaaS-only
assumptions into core business logic.

## 31. Product modes

**AORMS Cloud** (AORMS-managed), **AORMS BYO Infrastructure** (customer
DB/Drive/AI), **AORMS Private** (customer environment) — all share the
same core architecture.

## 32. Non-negotiable development rules

**Do not:**
duplicate business logic across pages · call AI providers directly from
UI components · call Google Drive directly from browser components ·
put API keys in frontend code · store Drive files unnecessarily in
Supabase · create independent authentication systems for every module ·
create client login systems unnecessarily · hard-code workflow logic
into individual pages · hard-code one AI provider · create
provider-specific database schemas · introduce new infrastructure
without architectural justification · bypass RLS · expose service-role
credentials to the browser.

**Do:**
use service abstractions · use typed APIs · use RLS · use tenant-aware
queries · use audit logging · use events for meaningful state changes ·
use workflows for automation · use connectors for external systems ·
keep AI provider-independent · keep documents provider-independent ·
keep database access provider-independent.

## 33. Definition of done for V2 architecture

- [ ] Google sign-in works *(code + Supabase config both live and verified on production — see LIGHTWEIGHT-ARCHITECTURE-PLAN.md's Google Sign-In section; one Google Cloud Console step — the redirect URI — left, only the account owner can add it)*
- [ ] Drive connects during onboarding *(UI live on `/studios/[studioId]` (AORMS Platform, not `/firm-settings` — relocated 2026-09-20, see § Connector configuration lives on the Platform below); button itself not click-tested live, no OWNER-role test account can reach it, but reuses the exact pattern already proven in production for Google Sign-In)*
- [ ] Practice can be created in one setup
- [ ] Existing Drive folders can be mapped
- [x] Supabase remains default DB
- [x] External DB/API architecture exists
- [x] AI provider abstraction exists
- [x] Ollama connector exists *(wired end-to-end into `askEsti()` — see LIGHTWEIGHT-ARCHITECTURE-PLAN.md; not runtime-tested against a live model, no Ollama instance reachable in this environment)*
- [ ] Desktop Agent architecture exists
- [ ] WhatsApp channel abstraction exists
- [ ] External users don't require mandatory accounts *(not audited this pass — flagged, not assumed either way)*
- [x] Event system exists
- [x] Workflow engine exists
- [ ] Initial automations work *(the mechanism is verified with real test workflows; the §23 automations list itself isn't built as real `workflow_definitions` rows yet)*
- [x] Esti uses tools rather than unrestricted DB access *(wired into `askEsti()`, not just built)*
- [ ] RAG works against customer-controlled data
- [x] Audit logs exist *(pre-existing `audit_log`, not yet the expanded §25 event set)*
- [x] RLS/tenant isolation is enforced
- [x] No unnecessary cloud infrastructure introduced

Checkboxes reflect this repo's actual state as of 2026-09-20 — updated as
each phase in LIGHTWEIGHT-ARCHITECTURE-PLAN.md lands and is live-verified,
not marked done speculatively.

## Connector configuration lives on the Platform, not the Office Hub

**Explicit correction, 2026-09-20**: WhatsApp connections, the Google
Drive connection (the credential itself, not the `documents` file
metadata it feeds), AI model connectors, and the database connector
(`tenant_databases`, unaffected — already correct) all live on
**aorms-platform**, keyed by `studio_id`, not on **aorms-web**, keyed by
`firm_id`. This reverses this spec's own original placement for Drive
and WhatsApp (both originally built firm_id-keyed on aorms-web, then
relocated same-day once caught) — the reasoning: a connector credential
is portable identity-platform infrastructure a Studio owns once, not
Office Hub business data scoped to one deployment's session. `firm_id`
stays correct for genuine business data (`documents`, `events`,
`workflow_definitions`, etc. — see § Reconciling below); it was only ever
wrong for the connector credential tables themselves.

Established pattern for a new connector table, matching
`tenant_databases` (`platform/supabase/migrations/0034`),
`whatsapp_connections` (`0038`), and `drive_connections` (`0039`):
- Table + secret columns on **aorms-platform**, `studio_id not null
  references public.studios(id)`.
- RLS: `is_studio_owner(studio_id) or is_platform_admin()` for both read
  and write — never `has_capability()`/`current_firm_id()`, which are
  aorms-web-only concepts.
- A `security definer` `store_*_connection()` RPC that re-checks
  `is_studio_owner()`/`is_platform_admin()` internally (defense in depth,
  not just the RLS policy) and writes the secret via `vault.create_secret()`.
- A `get_*_token()`/`get_*_secret()` reader, `service_role`-only —
  never even the studio owner reads the decrypted secret back directly.
- Any write path reached from an **Office Hub** page (not a Platform
  page) must go through the Platform's service-role client with the
  Office Hub's own RLS/capability check performed first — the two
  projects have separate Supabase Auth, so `auth.uid()`-based Platform
  RLS doesn't see an Office Hub session at all. Prefer routing the actual
  UI onto a Platform-authenticated page (`/studios/[studioId]`) instead,
  as Drive's OAuth flow does, rather than bridging sessions.
- `revoke execute on function ... from public, anon, authenticated;` on
  every new function immediately, including trigger functions — the
  PUBLIC-execute grant gap (§ elsewhere in ROADMAP.md's dated entries)
  applies on aorms-platform exactly as it does on aorms-web.

## Reconciling this spec with the existing codebase

This spec's table examples use `company_id` as the tenant column
generically; **this codebase's actual multi-tenancy column is `firm_id`**,
already live across ~98 tables (see the multi-tenancy entry in
[ROADMAP.md](ROADMAP.md)). New tables built against this spec (`events`,
`workflow_definitions`, `documents`, etc.) use `firm_id` to stay
consistent with the rest of the schema, not `company_id` — introducing a
second tenant-column name would be the inconsistency, not avoiding it.
Everywhere else, table/column names below follow this repo's existing
conventions (e.g. `project_offices` not `projects`) rather than
transcribing this spec's examples literally.
