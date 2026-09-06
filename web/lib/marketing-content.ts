/**
 * Marketing copy for web/'s public landing page — trimmed port of
 * frontend/src/lib/product-nomenclature.ts's AORMS_PLATFORM/ESTI/
 * HUMAN_CENTRIC_WORKS constants (the "not part of the migration spec"
 * marketing surface `web/` never had — its root route was a bare auth
 * redirect until this file). Only the fields the landing page actually
 * uses — web/ is a single unified hub, not the multi-portal/licensing
 * model the old constants also cover, so that apparatus isn't ported.
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
    title: "Full workspace",
    body: "One licence covers clients, projects, proposals, invoices, team management, knowledge bank, and delivery tracking on one unified office hub. Unlimited staff logins.",
  },
  {
    eyebrow: "Basis of fee",
    title: "5 GB included",
    body: "Drawings and firm files. Extra storage billed per GB-month when you grow — no surprise edition upgrades, no per-seat pricing.",
  },
  {
    eyebrow: "Exclusions",
    title: "No metered AI",
    body: "ESTI runs on the hub against your firm's own data — no per-token billing, no bring-your-own key needed. There is nothing else to buy.",
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
