/**
 * Marketing copy for web/'s public landing page — trimmed port of
 * frontend/src/lib/product-nomenclature.ts's AORMS_PLATFORM/ESTI/
 * HUMAN_CENTRIC_WORKS constants (the "not part of the migration spec"
 * marketing surface `web/` never had — its root route was a bare auth
 * redirect until this file).
 *
 * Stale-doc correction (2026-09-10): this comment used to say "web/ is a
 * single unified hub, not the multi-portal/licensing model the old
 * constants also cover, so that apparatus isn't ported" — no longer true.
 * The AORMS Platform (portable AORMS-U- identity, per-studio Trial/
 * Standard/Premium licensing, Razorpay payments — see
 * docs/esti/AORMS-PLATFORM-ARCHITECTURE.md) is real and live as of
 * 2026-09-09. LICENSING/IDENTITY below reflect it; FEE_PROPOSAL was
 * rewritten the same date — it used to describe a flat "one licence,
 * nothing else to buy, unlimited seats" model that directly contradicted
 * the real per-seat tiered system once that existed. No specific prices
 * appear anywhere on this page: the actual per-seat rates
 * (`plan_pricing`, platform/supabase/migrations/0010_payments.sql) are
 * still placeholder values pending review on /admin/pricing — stating a
 * number here before that's confirmed would commit to a price nobody's
 * decided yet.
 */

export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Architecture Operations & Resource Management System",
  tagline: "The practice management system, run the way architects think",
  // 2026-09-10, explicit direction: was "Run your practice the way you
  // run a drawing set."
  heroHeadline: "The Command Center for Architecture Practice.",
  heroSupport:
    "Built for architects, not adapted from generic project software. Every client, project, fee, and drawing lives on one record — precise, cross-referenced, and always current. Web-based, cloud-only. Developed for architecture practices in India.",
} as const;

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  summary:
    "Built-in office automation — answers only from validated firm repositories; recommendations, insights, task automation, document generation.",
} as const;

/**
 * Public demo credentials (2026-09-10) — deliberately displayed in plain
 * text on the landing page, not hidden behind a magic-link auto-login:
 * standard practice for a public SaaS demo, and simpler than building a
 * dedicated sign-in Server Action that would need to store this same
 * password server-side anyway. The account itself is VIEWER-role
 * (read-only, RLS-enforced — see web/supabase/migrations/
 * 0035_demo_account.sql) and its data resets nightly via pg_cron, also in
 * that migration. The account is created manually via /users, not by any
 * code path — these values must match exactly what was actually created
 * there, or sign-in fails with nothing on this page explaining why.
 */
export const DEMO = {
  email: "demo@aorms.in",
  password: "DemoAORMS2026!",
} as const;

export const HUMAN_CENTRIC_WORKS = {
  legalName: "Human Centric Works",
  attribution: "Developed by Human Centric Works",
  location: "Hospet, Karnataka, India",
  email: "hi@aorms.in",
} as const;

/**
 * A generic trust strip, not fabricated social proof (2026-09-10,
 * explicit direction: "for 5 [social proof]... use placeholder/generic").
 * Deliberately NOT fake testimonials, invented client names/logos, or a
 * made-up customer count — every line here is a claim already made
 * elsewhere on this page and independently true (India hosting: the
 * blog/FAQ; GST/TDS: BRIEF/FEE_PROPOSAL; no metered AI: FEE_PROPOSAL).
 * This is a placeholder in the sense of "no real customer quotes exist
 * yet to feature" — not a placeholder standing in for something false.
 */
export const TRUST_STRIP = [
  "Built for Indian architecture practices",
  "GST & TDS compliant by design",
  "Data hosted in Mumbai (AWS ap-south-1)",
  "No metered AI billing",
] as const;

export const BRIEF = [
  {
    n: "01",
    title: "One record, not a folder per app",
    body: "Clients, projects, proposals, and invoices linked on one record — a fee proposal references its project, an invoice references its proposal and phase. Nothing re-typed, nothing drifts out of sync.",
  },
  {
    n: "02",
    title: "Written for how a practice actually bills",
    body: "COA fee scales, phase-wise billing against work stages, GST/TDS on professional fees, client approval gates before a rupee is invoiced — the domain logic is architecture, not adapted from a generic project template.",
  },
  {
    n: "03",
    title: "Your drawings, your data, your infrastructure",
    body: "Firm data stays in your environment; nothing trains a third-party model. The built-in AI (ESTI) answers only from your own firm's records — never a public model guessing at your practice.",
  },
] as const;

export const SPECIFICATION = [
  { code: "M-01", title: "Clients & Leads", body: "CRM with interaction log, tender tracking, portal access" },
  { code: "M-02", title: "Projects", body: "Phases, tasks, milestones, moodboards, delivery tracking" },
  { code: "M-03", title: "Proposals & Contracts", body: "Unified proposals with client approval gates and versioning" },
  { code: "M-04", title: "Invoicing & Finance", body: "GST-compliant invoicing, reconciliation, cash book, reports" },
  { code: "M-05", title: "Team & HR", body: "Roster, assignments, leaves, payroll, performance scoring" },
  { code: "M-06", title: "Estimation & BBS", body: "Rate books, priced BOQ, IS 456 bar bending schedules" },
] as const;

export const FEE_PROPOSAL = [
  {
    eyebrow: "Scope",
    title: "Every plan, the same hub",
    body: "Trial, Standard, and Premium all run the same office hub — clients, projects, proposals, invoices, team, knowledge bank, delivery tracking. Plans differ in seats and support, never in which features you can reach.",
  },
  {
    eyebrow: "Basis of fee",
    title: "Licensed per seat",
    body: "One licence per studio, priced per staff seat, managed from your own AORMS Identity — start on Trial, upgrade in-app when you're ready. No edition lock-in, no separate module purchases.",
  },
  {
    eyebrow: "Exclusions",
    title: "No metered AI",
    body: "ESTI runs on the hub against your firm's own data — no per-token billing, no bring-your-own key needed, on every plan including Trial.",
  },
] as const;

/**
 * Two distinct identity types on the AORMS Platform (2026-09-10 rewrite —
 * the section used to explain only the individual side). "Individual" =
 * a person's own AORMS-U- account. "Studio" = an architecture practice's
 * own AORMS-S- account — colloquially "your company," but named Studio
 * throughout the actual product (see docs/esti/AORMS-PLATFORM-
 * ARCHITECTURE.md's nomenclature table: "Company" is reserved for the
 * separate material-supplier entity type, COMPANY_IDENTITY below).
 * Deliberately not two separate signup flows: a Studio is created *from*
 * an Individual identity once signed in, not a parallel account type you
 * choose instead of one — both sub-sections share IdentityCtas for
 * exactly that reason.
 */
export const INDIVIDUAL_IDENTITY = {
  eyebrow: "Individual Identity",
  title: "You, not your employer.",
  body: "A portable personal account — one AORMS-U- handle that's yours alone, independent of who currently employs you. Link it once, carry it into every practice you work at, present or future. Every identity starts Basic and promotes to Pro automatically at 100 hours of active use — no form, no approval step, nothing to apply for.",
} as const;

export const STUDIO_IDENTITY = {
  eyebrow: "Studio Identity",
  title: "Your practice's own account.",
  body: "Your architecture practice gets its own identity too — an AORMS-S- handle, separate from any one person's login. Invite your team, manage who's an owner versus a member, and hold the Studio's own Trial/Standard/Premium licence — all under the Studio itself, not scattered across individual accounts.",
} as const;

export const IDENTITY = [
  {
    eyebrow: "Portable",
    title: "One handle, every studio",
    body: "Your AORMS Identity (an AORMS-U- handle) is yours, not your studio's — link it once and carry the same account into every practice you work at, present or future.",
  },
  {
    eyebrow: "Earned, not applied for",
    title: "Basic to Pro at 100 hours",
    body: "Every identity starts Basic. Cross 100 hours of active use and it promotes to Pro automatically — no form, no approval step, no application to file.",
  },
  {
    eyebrow: "Licensing lives here",
    title: "Your studio's plan, in one place",
    body: "A studio's Trial/Standard/Premium licence, seats, and renewal all sit under the same Identity sign-in that manages the account itself.",
  },
] as const;

/**
 * A second, distinct entity type from Studio above — material/interior
 * suppliers, not architecture practices. Real and live
 * (platform/supabase/migrations/0007_supplier_companies.sql,
 * 0008_material_catalogue.sql) but previously absent from this landing
 * page entirely — every visitor so far only ever saw the architect-facing
 * side of the Platform.
 */
export const COMPANY_IDENTITY = [
  {
    eyebrow: "Your own catalogue",
    title: "Products, specs, test results",
    body: "List what you make or supply — product name, specifications, lab test results, SKU, MRP — under your Company's own AORMS-C- identity, separate from any architecture Studio's account.",
  },
  {
    eyebrow: "Found by location",
    title: "Nearest-first discovery",
    body: "Every Studio browsing the Materials directory sees your products ranked by proximity — same city first, then same state — not buried under listings from the other side of the country.",
  },
  {
    eyebrow: "One identity, real reach",
    title: "Every Studio can find you",
    body: "No separate sales portal to maintain — the same Materials directory every architecture practice on AORMS already has access to is where your catalogue shows up.",
  },
] as const;

export const FAQ = [
  {
    question: "Is this built for architecture practices specifically?",
    answer:
      "Yes — pure architectural consultancy, not a generic multi-discipline AEC tool. COA fee scales, GST/TDS on professional fees, and phase-wise billing are native to the domain model, not bolted on.",
  },
  {
    question: "Where does our data live?",
    answer:
      "In your own firm's cloud workspace, hosted on AWS in Mumbai (ap-south-1). ESTI, the built-in AI agent, answers only from your firm's own validated records — it never trains a third-party model and never guesses from public data.",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "No — AORMS is web-only, single sign-on into one office hub. No installers, no per-app logins, no separate desktop shell to maintain.",
  },
  {
    question: "What happens when our Trial ends?",
    answer:
      "Every Studio starts on a 30-day Trial, no card required. If it lapses before you upgrade, the licence shows as inactive until a Standard or Premium plan is purchased — nothing is auto-charged, and nothing is deleted.",
  },
  {
    question: "Is there a limit on team size?",
    answer:
      "No fixed cap — licensing is per seat, so you add exactly as many staff logins as your team needs on your plan, and adjust as the practice grows.",
  },
  {
    question: "Can we bring in our existing client and project data?",
    answer:
      "There's no automated bulk-import wizard yet — most practices start clean and add active clients and projects directly. If you're migrating a large existing dataset, get in touch and we'll help plan it.",
  },
] as const;
