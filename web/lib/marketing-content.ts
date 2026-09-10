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
  heroHeadline: "Run your practice the way you run a drawing set.",
  heroSupport:
    "Built for architects, not adapted from generic project software. Every client, project, fee, and drawing lives on one record — precise, cross-referenced, and always current. Web-based, cloud-only.",
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

export const FAQ = [
  {
    question: "Is this built for architecture practices specifically?",
    answer:
      "Yes — pure architectural consultancy, not a generic multi-discipline AEC tool. COA fee scales, GST/TDS on professional fees, and phase-wise billing are native to the domain model, not bolted on.",
  },
  {
    question: "Where does our data live?",
    answer:
      "In your own firm's cloud workspace. ESTI, the built-in AI agent, answers only from your firm's own validated records — it never trains a third-party model and never guesses from public data.",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "No — AORMS is web-only, single sign-on into one office hub. No installers, no per-app logins, no separate desktop shell to maintain.",
  },
] as const;
