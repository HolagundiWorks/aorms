# AORMS — Developer Guide
## Next.js + TypeScript + Carbon Design System + Supabase

**Document status:** Development specification — target architecture for the
next rebuild. The current production codebase (`backend` Fastify/tRPC,
`frontend` Vite/React SPA, `packages/contracts`, Python `worker`) stays live
and unchanged until this migration is executed; nothing here is implemented
yet. See [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) for migration sequencing and
[ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md) for how this environment verifies it.
**Target deployment:** Hostinger Managed App Hosting
**Target users:** ~100 concurrent/registered users
**Application type:** Architecture / Engineering ERP
**Primary objective:** Simplify the existing AORMS architecture while retaining its business functionality.

---

# 1. Project Objective

AORMS is to be developed as a professional ERP web application for architecture/engineering practice management.

The application should provide a unified platform for:

- Project management
- Client management
- Leads and CRM
- Proposals and quotations
- Invoicing and payments
- Estimation
- BOQ and measurements
- Documents
- PDF/DWG-related workflows
- Tasks
- Reporting
- User and role management
- Organization management
- Audit/history
- Optional AI-assisted functionality

The application is intended for approximately **100 users**.

The system should therefore prioritize:

1. Reliability
2. Simplicity
3. Maintainability
4. Security
5. Good database design
6. Fast ERP workflows
7. Low deployment complexity
8. Ability to scale later without unnecessary infrastructure today

---

# 2. Target Architecture

The existing AORMS architecture should be simplified.

## Current architecture

```text
React SPA
    ↓
tRPC
    ↓
Fastify
    ↓
PostgreSQL

+

Python worker
```

## Target architecture

```text
                         INTERNET
                            │
                            ▼
                 ┌─────────────────────┐
                 │       Hostinger     │
                 │                     │
                 │ Next.js Application │
                 │                     │
                 │ React + TypeScript  │
                 │ Carbon Design       │
                 │ Server Components   │
                 │ Server Actions      │
                 │ Route Handlers      │
                 │ Business Logic      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       Supabase      │
                 │                     │
                 │ PostgreSQL          │
                 │ Authentication      │
                 │ Storage             │
                 │ Row Level Security  │
                 └─────────────────────┘
                            │
                            ▼
                 Optional Python Worker
                 for heavy processing
```

The primary application should consist of:

> **Next.js + TypeScript + Carbon Design System + Supabase**

---

# 3. Do Not Introduce Unnecessary Backend Frameworks

The target application should **not** introduce another standalone backend unless there is a demonstrated technical requirement.

Do not add:

- Express
- Fastify
- NestJS
- tRPC
- separate Node API server

unless specifically justified.

Next.js is responsible for both:

### Frontend

- React UI
- Routing
- Layouts
- Navigation
- Forms
- Tables
- Dashboards
- Client interactions

### Backend/application layer

- Server Components
- Server Actions
- Route Handlers
- Authentication integration
- Authorization
- Business logic
- Database operations
- API endpoints where required

---

# 4. Technology Stack

## Core

```text
Next.js
TypeScript
React
Supabase
PostgreSQL
```

## UI/UX

```text
IBM Carbon Design System
```

Carbon should be the primary UI component library.

Do not create a second competing design system.

---

# 5. Carbon Design System

AORMS should use the **IBM Carbon Design System** as its foundational UI/UX system.

Carbon should provide the base components for:

- Navigation
- Buttons
- Forms
- Inputs
- Selects
- Comboboxes
- Tables
- Data tables
- Tabs
- Modals
- Notifications
- Toasts
- Date pickers
- File upload
- Pagination
- Search
- Filtering
- Menus
- Side panels
- Progress indicators
- Loading states

---

# 6. AORMS Design Layer

Do not directly scatter Carbon styling throughout every page.

Create an AORMS component layer on top of Carbon.

Example:

```text
/components
    /aorms
        AormsPageHeader
        AormsDataTable
        AormsStatus
        AormsMetric
        AormsForm
        AormsDialog
        AormsEmptyState
        AormsLoading
        AormsError
        AormsDocumentCard
        AormsProjectCard
        AormsMeasurementTable
        AormsMoney
```

The hierarchy should be:

```text
Carbon
   ↓
AORMS Design Tokens
   ↓
AORMS Components
   ↓
ERP Modules
   ↓
Application Screens
```

This allows the visual language to be changed globally later.

---

# 7. UI Philosophy

AORMS is an ERP.

The UI should therefore prioritize:

- Information density
- Speed
- Clarity
- Consistency
- Keyboard usability
- Efficient data entry
- Search
- Filtering
- Bulk actions
- Tables
- Contextual actions
- Minimal unnecessary animation

Avoid designing it like a marketing website.

The interface should feel like a serious professional business application.

---

# 8. Application Layout

The standard application shell should be approximately:

```text
┌──────────────────────────────────────────────────────────┐
│ AORMS                         Search        User / Org ▾ │
├────────────────┬─────────────────────────────────────────┤
│                │                                         │
│ Dashboard      │                                         │
│ Projects       │               CONTENT                   │
│ Clients        │                                         │
│ CRM            │                                         │
│ Proposals      │                                         │
│ Invoices       │                                         │
│ Estimates      │                                         │
│ Measurements   │                                         │
│ Documents      │                                         │
│ Reports        │                                         │
│                │                                         │
│ Administration │                                         │
│                │                                         │
└────────────────┴─────────────────────────────────────────┘
```

Use Carbon's application shell/navigation patterns wherever appropriate.

---

# 9. ERP Modules

The application should be modular.

Recommended structure:

```text
AORMS
│
├── Dashboard
│
├── CRM
│   ├── Leads
│   ├── Clients
│   └── Contacts
│
├── Projects
│   ├── Projects
│   ├── Tasks
│   ├── Milestones
│   └── Project Team
│
├── Commercial
│   ├── Proposals
│   ├── Quotations
│   ├── Contracts
│   ├── Invoices
│   └── Payments
│
├── Estimation
│   ├── Estimates
│   ├── BOQ
│   ├── Rate Analysis
│   └── Measurements
│
├── Documents
│   ├── Files
│   ├── Drawings
│   ├── PDFs
│   └── Versions
│
├── Reports
│
└── Administration
    ├── Users
    ├── Roles
    ├── Permissions
    ├── Organization
    └── Audit Logs
```

Modules should be independently maintainable.

---

# 10. Next.js Structure

Use the modern Next.js App Router.

Suggested structure:

```text
app/
├── (auth)/
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
│
├── (app)/
│   ├── dashboard/
│   ├── projects/
│   ├── clients/
│   ├── crm/
│   ├── proposals/
│   ├── invoices/
│   ├── estimates/
│   ├── measurements/
│   ├── documents/
│   ├── reports/
│   └── settings/
│
├── api/
│   └── ...
│
├── layout.tsx
└── page.tsx
```

Use route groups to separate authentication and application areas.

---

# 11. Server vs Client Components

Use **Server Components by default**.

Use Client Components only when interactive behavior requires them.

### Prefer Server Components for

- Database reads
- Dashboard data
- Project lists
- Client lists
- Reports
- Static ERP screens
- Permission-aware rendering

### Use Client Components for

- Interactive forms
- Carbon DataTable interactions
- Modals
- Drag/drop
- Real-time UI
- Client-side filtering
- Complex editors
- File upload interactions

Do not mark entire pages `"use client"` unnecessarily.

---

# 12. Backend Design

Next.js should provide the application backend.

Use:

### Server Actions

For appropriate mutations:

```text
Create Project
Update Client
Create Invoice
Add Measurement
Approve Proposal
Update Task
```

### Route Handlers

Use for:

- External API endpoints
- Webhooks
- File processing endpoints
- Integrations
- Machine-to-machine communication
- APIs that need a conventional HTTP interface

Example:

```text
/api/webhooks/...
/api/documents/...
/api/reports/...
```

Business logic should not be duplicated between Server Actions and Route Handlers.

Create reusable service functions.

---

# 13. Business Logic Layer

Do not put complex business logic directly into React components.

Suggested:

```text
src/
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   └── utils/
│
├── services/
│   ├── projects/
│   ├── clients/
│   ├── invoices/
│   ├── estimates/
│   ├── measurements/
│   └── documents/
│
├── types/
│
└── components/
```

Example:

```text
UI
 ↓
Server Action
 ↓
Service
 ↓
Validation
 ↓
Supabase
 ↓
PostgreSQL
```

---

# 14. Supabase

Supabase should provide the main data infrastructure.

Use:

```text
Supabase
├── PostgreSQL
├── Authentication
├── Storage
└── Row Level Security
```

Do not build a custom authentication system unless absolutely necessary.

---

# 15. Database

PostgreSQL should be the authoritative source of application data.

Database design should prioritize:

- Proper relationships
- Foreign keys
- Indexes
- Constraints
- Unique constraints
- Auditability
- Soft deletion where appropriate
- Tenant/organization isolation

Avoid storing complex relational business data as arbitrary JSON when normal relational structures are more appropriate.

---

# 16. Authentication

Supabase Auth should manage:

- Login
- Logout
- Password management
- Sessions
- User identity
- Email verification
- Password reset

Application user profiles should be stored separately from authentication records.

Example:

```text
auth.users
      │
      ▼
profiles
      │
      ▼
organization_members
      │
      ├── role
      └── permissions
```

---

# 17. Authorization

Authentication and authorization must be treated separately.

Authentication answers:

> Who is this user?

Authorization answers:

> What can this user do?

Implement authorization at multiple levels:

```text
Next.js authorization
        +
Supabase Row Level Security
```

Never rely only on hidden UI buttons for security.

A user who cannot see an "Delete" button must also be prevented from executing the underlying database operation directly.

---

# 18. User Hierarchy

AORMS should support organizational hierarchy.

Potential structure:

```text
Organization
│
├── Owner / Admin
│
├── Managers
│
├── Staff
│
├── Finance
│
└── External / Restricted users
```

Permissions should be granular.

Examples:

```text
projects.read
projects.create
projects.update
projects.delete

invoices.read
invoices.create
invoices.approve

documents.read
documents.upload
documents.delete
```

Do not hard-code permissions into individual pages.

Create a reusable authorization system.

---

# 19. Documents and Files

Use Supabase Storage for application files where appropriate.

Documents should have database metadata.

Example:

```text
documents
├── id
├── project_id
├── name
├── type
├── storage_path
├── version
├── uploaded_by
├── created_at
└── updated_at
```

Do not treat the Storage bucket as the application database.

---

# 20. PDF/DWG Processing

Heavy processing should not block normal ERP requests.

If existing Python functionality is required for:

- PDF processing
- DWG processing
- Drawing analysis
- Reconciliation
- Measurement extraction

keep it as an **optional worker service**.

Architecture:

```text
Next.js
   │
   ▼
Supabase
   │
   ▼
Job record / Storage
   │
   ▼
Python Worker
   │
   ▼
Processed result
```

The ERP should continue functioning if the worker is temporarily unavailable.

---

# 21. AI

AI must be an **optional subsystem**, not a core dependency.

Do not make basic ERP functionality dependent on an AI provider.

Architecture:

```text
AORMS Core
│
├── ERP
├── Database
├── Documents
├── Projects
└── Finance
        │
        └── Optional AI Layer
              ├── Provider A
              ├── Provider B
              └── Local AI
```

If an AI provider is disabled, the ERP must continue operating normally.

AI integration should therefore be isolated behind a service interface.

---

# 22. WordPress

WordPress should not be used as the ERP application framework.

Use WordPress for:

```text
yourdomain.com
```

Public website.

Use Next.js for:

```text
app.yourdomain.com
```

AORMS ERP.

Recommended:

```text
www.yourdomain.com
        ↓
WordPress

app.yourdomain.com
        ↓
Next.js AORMS
        ↓
Supabase
```

Do not create a custom WordPress plugin merely to embed the ERP unless there is a specific business requirement.

---

# 23. Hosting

Primary deployment target:

> **Hostinger Managed App Hosting / Node.js application hosting**

Do not assume a VPS is required.

Initial target:

```text
Hostinger
    │
    └── Next.js AORMS
             │
             ▼
          Supabase
```

Supabase hosts the database/auth/storage infrastructure.

Hostinger hosts the Next.js application.

---

# 24. Deployment Philosophy

Keep deployment simple.

The preferred deployment should require:

```text
GitHub
   ↓
Hostinger
   ↓
Next.js
```

Avoid unnecessary:

- Kubernetes
- Docker orchestration
- Multiple API servers
- Multiple databases
- Self-hosted authentication
- Self-hosted PostgreSQL

Infrastructure can be expanded later if actual load requires it.

---

# 25. Performance Target

Initial design target:

> Approximately 100 users.

Optimize for realistic ERP usage rather than extreme internet-scale traffic.

Prioritize:

- Fast initial navigation
- Efficient database queries
- Pagination
- Indexed searches
- Server-side filtering
- Lazy loading
- Appropriate caching
- Efficient file handling

Never load thousands of database rows into the browser unnecessarily.

---

# 26. Tables

ERP tables should be a major UI pattern.

Tables should support, where appropriate:

- Search
- Sorting
- Filtering
- Pagination
- Column selection
- Row actions
- Bulk actions
- Status indicators
- Empty states
- Loading states
- Error states

Example:

```text
Projects

[ Search projects... ] [Filter] [Create project]

┌────────────┬────────────┬──────────┬───────────┬─────┐
│ Project    │ Client     │ Status   │ Manager   │ ⋮   │
├────────────┼────────────┼──────────┼───────────┼─────┤
│ Project A  │ Client X   │ Active   │ User 1    │ ⋮   │
│ Project B  │ Client Y   │ Pending  │ User 2    │ ⋮   │
└────────────┴────────────┴──────────┴───────────┴─────┘
```

---

# 27. Forms

ERP forms must prioritize fast data entry.

Use:

- Clear labels
- Logical grouping
- Validation
- Inline errors
- Required field indication
- Keyboard navigation
- Sensible defaults
- Autosave where appropriate
- Confirmation for destructive operations

Avoid excessively long single-page forms.

Use Carbon patterns for:

- Form groups
- Accordions
- Side panels
- Tabs
- Modals

where appropriate.

---

# 28. Status System

Create a consistent status component.

Example:

```text
Draft
Pending
Active
Approved
Rejected
Completed
Cancelled
Archived
```

Do not create visually different status styles for every module.

Use one AORMS status system.

---

# 29. Money and Numbers

Financial values must use proper numeric handling.

Do not use floating-point arithmetic for financial calculations where precision matters.

Use PostgreSQL numeric/decimal types and appropriate TypeScript representations.

Currency formatting should be centralized.

Example:

```text
₹1,25,000.00
```

or the organization's configured currency.

Do not hard-code currency formatting throughout components.

---

# 30. Audit Logs

Important ERP operations should be auditable.

Track:

```text
who
what
when
where
old value
new value
```

Examples:

```text
Invoice approved
Project status changed
Proposal edited
Document deleted
User permission changed
Payment recorded
```

Audit logging should be centralized.

---

# 31. Error Handling

Every major screen should support:

```text
Loading
Success
Empty
Error
Unauthorized
Not Found
```

Example:

```text
Loading:
[ Carbon Skeleton ]

Empty:
No projects found.
[ Create Project ]

Error:
Unable to load projects.
[ Retry ]
```

Do not allow raw database errors to appear in the UI.

---

# 32. Security Principles

Never trust the browser.

Validate:

- User identity
- Permissions
- Input values
- File types
- File sizes
- Organization ownership
- Database relationships

Security must exist at the server/database level.

---

# 33. Code Quality

Use TypeScript strictly.

Avoid:

```text
any
```

unless there is a documented reason.

Prefer:

```text
interfaces
types
generics
schemas
validated inputs
```

Use a consistent validation library such as Zod if appropriate.

---

# 34. Shared Types

Avoid duplicating data structures.

For example, do not define `Project` separately in:

```text
frontend
backend
database
```

when a shared type/schema can be used.

Database types should be generated from Supabase where practical.

---

# 35. Project Organization

Recommended high-level structure:

```text
aorms/
│
├── app/
│   ├── (auth)/
│   ├── (app)/
│   └── api/
│
├── components/
│   ├── carbon/
│   └── aorms/
│
├── services/
│   ├── projects/
│   ├── clients/
│   ├── crm/
│   ├── finance/
│   ├── documents/
│   └── estimation/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   └── utils/
│
├── types/
│
├── supabase/
│   ├── migrations/
│   └── seed/
│
├── workers/
│   └── python/
│
├── public/
│
├── package.json
├── tsconfig.json
└── next.config.ts
```

The exact structure can be adapted after inspecting the existing AORMS repository.

---

# 36. Migration Strategy

Do not rewrite AORMS blindly.

First:

1. Audit the current repository.
2. Identify all existing frontend components.
3. Identify all Fastify routes.
4. Identify all tRPC procedures.
5. Identify business logic.
6. Identify database models.
7. Identify Python worker dependencies.
8. Identify authentication logic.
9. Identify file/document workflows.
10. Map each existing function to the new architecture.

Then migrate incrementally.

---

# 37. Migration Mapping

The intended mapping is:

```text
CURRENT                  TARGET

React SPA          →     Next.js React
React Router      →     Next.js App Router
tRPC procedures   →     Server Actions / Route Handlers
Fastify routes    →     Next.js backend
Business logic    →     services/
PostgreSQL        →     Supabase PostgreSQL
Existing auth     →     Supabase Auth
File storage      →     Supabase Storage
Python worker     →     Optional worker
Custom UI         →     Carbon Design System
```

Do not delete existing functionality until its replacement has been tested.

---

# 38. Development Sequence

Recommended implementation order:

## Phase 1 — Foundation

```text
Next.js
TypeScript
Carbon
Supabase
Authentication
Application shell
```

## Phase 2 — Core ERP

```text
Organizations
Users
Roles
Clients
Projects
Tasks
```

## Phase 3 — Commercial

```text
Proposals
Quotations
Contracts
Invoices
Payments
```

## Phase 4 — Technical

```text
Estimation
BOQ
Measurements
Documents
Drawings
```

## Phase 5 — Reporting

```text
Dashboards
Reports
Exports
Analytics
```

## Phase 6 — Advanced processing

```text
PDF
DWG
Python worker
Automated processing
```

## Phase 7 — Optional AI

```text
AI assistant
Document analysis
Automated summaries
AI-assisted estimation
```

---

# 39. Development Rule

The developer must not introduce a new framework or service simply because it is popular.

Every additional dependency should answer:

> What problem does this solve that the existing stack cannot solve adequately?

The target architecture intentionally favors:

```text
ONE application framework
ONE primary language
ONE database platform
ONE UI system
```

Specifically:

```text
Next.js
+
TypeScript
+
Supabase
+
Carbon
```

---

# 40. Final Target

The final AORMS architecture should be:

```text
                         AORMS
                           │
                    Next.js + TypeScript
                           │
             ┌─────────────┼─────────────┐
             │             │             │
           React        Backend       Carbon
             │             │             │
             └─────────────┼─────────────┘
                           │
                        Supabase
                           │
            ┌──────────────┼──────────────┐
            │              │              │
        PostgreSQL        Auth         Storage
            │
            │
       Optional Python
          Worker
```

## Core principle

**AORMS should be a Next.js ERP application, not a WordPress application.**

WordPress is only the public website.

Next.js is both the **frontend and application backend**.

Supabase provides the **database, authentication, storage and database-level security**.

Carbon provides the **UI/UX foundation**.

Python remains an **optional specialist processing worker**, used only where PDF/DWG or other heavy processing requires it.

This architecture is deliberately sized for the current ~100-user target while leaving room for future expansion.
