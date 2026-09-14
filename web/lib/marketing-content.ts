/**
 * Marketing copy for web/'s public landing page.
 *
 * 2026-09-14 full rebuild — per the "AORMS Landing Page & Pricing —
 * Developer Implementation Specification" the user supplied. Replaces
 * the previous Identity/Studio-account-framed page (dated comments below
 * from that era are removed; see git history for the prior version if
 * needed) with the spec's Problem → Outcome → Product → Proof → ROI →
 * Pricing → Demo structure, centered on the actual practice-management
 * product (projects, fees, revisions, Pulse, ESTI) rather than the
 * Platform's own account mechanics.
 *
 * A few things the spec asked for that this file deliberately does NOT
 * claim, because they aren't real yet — see docs/esti/ROADMAP.md's dated
 * entry for the full account:
 * - No claim of a documented public API, formal SSO, or an audit-log UI
 *   (not built).
 * - No "multi-office/multi-practice" claim for Enterprise — this Office
 *   Hub deployment is single-tenant per Studio; that's a real
 *   architecture constraint, not a copy choice.
 * - Revision Management's copy describes the real product (a qualitative
 *   impact rating + client-approval workflow), not the spec's own
 *   worked example (a specific ₹ fee-impact/days-schedule-impact on one
 *   named revision) — the real `decisions` table has no such fields.
 */

export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Architecture Practice Operating System",
  tagline: "Run the practice. Don't chase the practice.",
  heroHeadline: "Run the practice.\nDon't chase the practice.",
  heroSupport:
    "AORMS connects projects, fees, revisions, approvals, tasks, documents, and people into one operating system built specifically for architecture practices — not adapted from generic project software.",
  /**
   * SEO meta description (kept under ~160 chars for the SERP snippet —
   * see the on-page heroSupport above for the longer version shown in
   * the hero itself and in the JSON-LD).
   */
  metaDescription:
    "AORMS is an operating system for architecture practices, connecting projects, fees, revisions, billing, approvals, teams, and practice intelligence in one platform.",
} as const;

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  summary: "Ask your practice, not the internet — answers only from your own studio's records.",
} as const;

/**
 * "ConnectDeX Partners" — a landing-page product name for the
 * material/interior-supplier side of the Platform. Kept small on this
 * page (spec's own non-negotiable list: "ConnectDeX removed from primary
 * AORMS conversion story") — a one-line footer/teaser presence only, not
 * part of the main product pitch.
 */
export const CONNECTDEX = {
  name: "ConnectDeX Partners",
  tagline: "Where material and interior suppliers connect with the practices specifying them",
} as const;

/**
 * Public demo credentials — displayed in plain text, standard practice
 * for a public SaaS demo. The account itself is VIEWER-role (read-only,
 * RLS-enforced) and its data resets nightly.
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
 * The problem section (spec §6) — the information-scatter chain
 * collapsing into one operating record.
 */
export const PROBLEM = {
  eyebrow: "The problem",
  title: "Architecture practices don't have a project problem.\nThey have an information problem.",
  body: "Projects live across WhatsApp, email, spreadsheets, drawings, meetings, site discussions, and invoices. By the time the information reaches the right person, the decision is already late.",
  chain: ["WhatsApp", "Email", "Excel", "Drawings", "Meetings", "Client", "Invoice"],
  resolution: {
    title: "AORMS",
    lines: ["One practice", "One operating record", "One source of truth"],
  },
} as const;

/**
 * Four core value cards (spec §7). `anchor` (UI/UX audit fix, 2026-09-14)
 * — each card used to be an implicit "read more below" promise that only
 * two of the four actually kept (fee recovery and revisions have their
 * own deep-dive sections; "what's slipping" and "team status" didn't
 * point anywhere). Rather than inventing two new sections that don't
 * exist in the product, each card now links to where that capability is
 * genuinely already shown: Pulse's own "Projects at risk"/"Open
 * revisions" tiles for slipping work, and its "Team unavailable" tile
 * for team status — connecting an existing promise to existing proof,
 * not a new claim.
 */
export const VALUE_CARDS = [
  {
    icon: "currency",
    title: "Capture work you forgot to bill.",
    body: "Connect work, revisions, milestones, and fees so billable activity doesn't disappear into the day-to-day project workflow.",
    anchor: "#fee-recovery",
  },
  {
    icon: "revision",
    title: "Every client change gets a price.",
    body: "Record the revision, assess its impact, cost it, get client approval, and only then execute it.",
    anchor: "#revision-management",
  },
  {
    icon: "risk",
    title: "Know what's slipping.",
    body: "Surface overdue tasks, blocked decisions, pending approvals, and project risk before they become delivery problems.",
    anchor: "#pulse",
  },
  {
    icon: "team",
    title: "Know where your team stands.",
    body: "See workload, ownership, availability, and pending work without asking everyone for a status update.",
    anchor: "#pulse",
  },
] as const;

/** Pulse showcase (spec §8) — the same daily-brief pipeline the hero
 * visual uses, shown again as its own dedicated section. */
export const PULSE_SECTION = {
  eyebrow: "Pulse",
  title: "Start the day already briefed.",
  body: "Pulse turns your practice data into a daily operating brief — what changed, what's urgent, what's billable, and what needs attention. Written the moment the page loads, from your own studio's real records.",
} as const;

/**
 * Fee Recovery (spec §9) — the same billing-forecast pipeline
 * (task progress → billable ₹), framed around the work→invoice chain.
 */
/**
 * "Billable so far" and "Still pending" used to sit as two equally-
 * weighted footer stats in BillingForecastPanel.tsx (§9) — but the one
 * question a practice actually asks day to day is "what can I bill
 * today?", not "what's left" (2026-09-14 follow-up: "the important
 * metric is the [figure] that needs to be billed today, structure both
 * the visuals and explanation accordingly"). Copy + panel restructured
 * so that figure — renamed "Ready to bill today" — is the one thing
 * this section leads with; the task progress bars become supporting
 * evidence for that number, and "still pending" is a small secondary
 * line, not a second hero figure.
 */
export const FEE_RECOVERY = {
  eyebrow: "Fee recovery",
  title: "Always know what's ready to bill today.",
  body: "AORMS connects operational activity with the commercial side of the practice — every task carries progress against its phase's fee, so the practice always has one live figure for what's earned and billable right now, not a guess reconstructed at invoice time.",
  chain: ["Work", "Task", "Milestone", "Billable", "Invoice", "Payment"],
} as const;

/**
 * Revision Management (spec §10) — deliberately does NOT use the spec's
 * own worked example (a specific ₹/days figure on one named revision):
 * the real `decisions` register tracks a qualitative impact rating
 * (Low/Medium/High) and a client-approval workflow, not a per-revision
 * fee/schedule delta. Copy describes the real product.
 */
export const REVISION_MANAGEMENT = {
  eyebrow: "Revision management",
  title: "Every client change, on the record before it's built.",
  body: "A change discussed on-site or in a meeting shouldn't turn into scope creep nobody signed off on. AORMS routes every client revision through the same lifecycle — tagged, assessed, sent for approval — before a single hour is spent on it.",
  stages: [
    {
      n: "01",
      title: "Tagged in the meeting",
      body: "Raised on a site visit or in a client meeting, the revision is tagged directly in that meeting's Minutes of Meeting — not a separate note someone has to remember to log later.",
    },
    {
      n: "02",
      title: "Sent to the client portal",
      body: "The tagged revision posts straight to the client's portal as a change request — the client sees exactly what was discussed, not a summary written days later.",
    },
    {
      n: "03",
      title: "Assessed by the team lead",
      body: "The assigned team member or lead rates its impact and adds what it actually changes — before it goes anywhere near the client's answer.",
    },
    {
      n: "04",
      title: "Approved, then worked on",
      body: "The assessed revision goes back to the client for explicit approval. Nothing is built against it until they say yes — so the design only ever moves on record, never quietly.",
    },
  ],
} as const;

/**
 * Project Operating Record (spec §11). `body` added (UI/UX audit fix,
 * 2026-09-14) — this was the only section on the page with no body
 * copy at all, just a heading over a wall of tags with nothing telling
 * a first-time visitor why the list mattered.
 */
export const PROJECT_RECORD = {
  eyebrow: "One project. One operating record.",
  title: "Every project, one place — not a folder plus a group chat.",
  body: "Every one of these lives on the same project record, not scattered across a chat thread, an inbox, and someone's personal spreadsheet — so the answer to \"what's the status\" is always one page, not a search.",
  fields: ["Client", "Project", "Phases", "Tasks", "Meetings", "Documents", "Revisions", "Approvals", "Fees", "Invoices", "Team", "Activity"],
} as const;

/** ESTI section (spec §12) — kept honest: the real interpreter is a
 * deterministic classifier over your own studio's data, not a
 * general-purpose conversational AI. */
export const ESTI_SECTION = {
  eyebrow: "ESTI",
  title: "Ask your practice.\nNot the internet.",
  body: "ESTI answers from your own studio's records — task priorities, project status, and what's on file for a project — grounded in your data, not the open internet.",
  exampleQuestions: [
    "What's the highest-priority task on Sharma Residence right now?",
    "Which tasks are blocked or missing information?",
    "What does the spec file say about the kitchen finish schedule?",
  ],
} as const;

/** Trust section (spec §15) — four cards, only claims already true
 * elsewhere on this page. */
export const TRUST_CARDS = [
  { title: "Data", body: "Your practice records stay under your own account, hosted in Mumbai (AWS ap-south-1)." },
  { title: "AI", body: "ESTI answers from your own studio's data — not trained on it, not shared with a third party." },
  { title: "Billing", body: "No per-token AI billing — AI is included in every paid plan, not metered separately." },
  { title: "Access", body: "Role-based access for your practice, enforced at the database level, not just the screen." },
] as const;

/**
 * Pricing (spec §17-20, §25) — real restructure (platform migration
 * 0033): FREE/STUDIO/PROFESSIONAL/ENTERPRISE. Prices shown here are
 * fixed reference copy for pages that don't fetch live plan_pricing;
 * `app/page.tsx`'s pricing section reads the live prices instead and
 * only uses this file for the feature lists/descriptions. Feature lists
 * are trimmed from the spec's own (which listed some aspirational items —
 * a documented API, formal SSO, an audit-log UI — not built yet) to what
 * this app actually does today.
 */
export const PRICING = {
  free: {
    name: "Free",
    tagline: "For exploring AORMS",
    includes: ["1 team member", "2 active projects", "Up to 3 clients, 3 contractors", "Pulse, projects, fees, revisions, approvals"],
    excludes: ["Full ESTI", "Advanced analytics", "Advanced billing"],
  },
  studio: {
    name: "Studio",
    tagline: "For small architecture practices",
    badge: "Most popular",
    includes: [
      "Up to 10 team members",
      "Up to 10 active projects",
      "Unlimited clients",
      "Projects, tasks, fees, billing, revisions, approvals",
      "Team & workload, Pulse, client portal",
      "Documents, reports, GST workflows",
      "ESTI Lite",
    ],
  },
  professional: {
    name: "Professional",
    tagline: "For growing practices",
    includes: [
      "Up to 25 team members",
      "Unlimited active projects",
      "Everything in Studio, plus:",
      "Advanced Pulse & analytics",
      "Fee-leakage detection",
      "Full ESTI",
      "Advanced reports, audit-friendly activity log",
      "Priority support, guided onboarding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    tagline: "For larger practices",
    includes: [
      "25+ team members",
      "Unlimited projects",
      "Custom subdomain (yourstudio.aorms.in)",
      "Dedicated onboarding & support",
      "Custom pricing based on your practice",
    ],
  },
} as const;

/**
 * A separate entity type from Studio — material/interior suppliers, not
 * architecture practices. Real and live. Used by app/connectdex-partners/
 * page.tsx (its own dedicated page, out of scope for this landing-page
 * rebuild — kept here unchanged since that page still imports it).
 */
export const COMPANY_IDENTITY = [
  {
    eyebrow: "Your own catalogue",
    title: "Products, specs, test results",
    body: "List what you make or supply — product name, specifications, lab test results, SKU, MRP — under your own ConnectDeX Partners identity, separate from any architecture Studio's account.",
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

/**
 * Explains what "operational leakage" actually is and how it shows up
 * in an Indian architecture practice specifically — added ahead of the
 * ROI calculator (2026-09-14 follow-up request) so the calculator's
 * inputs aren't abstract line items someone has to guess the meaning
 * of; each cause here maps to a real habit most Indian practices
 * already recognize.
 *
 * `pctOfHours` (2026-09-14 follow-up request) — every cause is given an
 * illustrative share of a project's total worked hours (the user's own
 * worked example: a ~300hr project, 15% unbilled revisions ≈ 45 hours),
 * used by `OperationalLeakageCalculator.tsx` (the page's one cost
 * calculator — the earlier separate ROI Calculator form was removed the
 * same day once this covered the same ground) to turn this list from
 * prose into an actual hours/₹ breakdown per cause. "Cost overruns" was
 * first left out of this math as a budget-overrun pattern rather than an
 * hours share, but was folded back in the same day ("Illustrative ROI"
 * — the disclaimer this whole calculator already carries — covers it
 * too, so there's no reason to carve it out into its own, separately
 * unmeasured card) at an illustrative 10%, same order of magnitude as
 * unbilled revisions.
 */
export const OPERATIONAL_LEAKAGE = {
  title: "What operational leakage actually is.",
  body: "Operational leakage is billable work and management time that quietly disappears before it ever reaches an invoice or a clear decision — not one dramatic loss, but a stack of small, familiar habits that eat into a practice's hours and fees every week.",
  causes: [
    {
      title: "Unbilled revisions",
      body: "A client asks for a change mid-project, the team makes it, and it's never logged as a separate scope item — the extra hours go in, but no fee ever comes out for them.",
      pctOfHours: 15,
    },
    {
      title: "Cost overruns",
      body: "Without a running view of phase progress against fee, a project quietly goes over budget on hours long before anyone notices — often not until the final account.",
      pctOfHours: 10,
    },
    {
      title: "Repetitive tasks",
      body: "The same coordination steps — chasing a drawing revision, re-confirming a site measurement, re-sending a document — get redone by hand on every project instead of once, properly.",
      pctOfHours: 5,
    },
    {
      title: "Figuring out task priority",
      body: "With no single ranked list, each team member spends real time every morning deciding what to work on first, instead of just working the list.",
      pctOfHours: 5,
    },
    {
      title: "Constant meetings",
      body: "Status updates that could be a glance at a dashboard become a recurring meeting instead — real hours spent restating what already happened rather than deciding what's next.",
      pctOfHours: 5,
    },
    {
      title: "Manual timesheet entries",
      body: "Hours get reconstructed from memory at the end of the week instead of tracked as work happens — some of it is simply forgotten, and never billed.",
      pctOfHours: 5,
    },
  ],
  closing: "Each of these on its own looks small. Together, they're the actual reason a task gets delayed — not the design work itself, but the management overhead stacked on top of it.",
} as const;

/** ROI Calculator disclaimer (spec §13 — always shown, unconditionally). */
export const ROI_DISCLAIMER = "Illustrative ROI only. Actual results vary by practice, workflow, billing discipline, and adoption.";

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
    answer: "No — AORMS is web-only, single sign-on into one office hub. No installers, no per-app logins, no separate desktop shell to maintain.",
  },
  {
    question: "Is there a genuinely free plan?",
    answer:
      "Yes — Free is a real, permanent plan (1 team member, 2 active projects), not a countdown trial. Upgrade to Studio or Professional in-app whenever you outgrow it; nothing is time-boxed or auto-charged.",
  },
  {
    question: "How is AORMS priced?",
    answer:
      "Per practice, not per person — Studio and Professional are flat annual fees covering the whole team up to that plan's member cap, not a per-seat tax. AI is included; there's no separate per-token billing.",
  },
  {
    question: "Can we bring in our existing client and project data?",
    answer:
      "There's no automated bulk-import wizard yet — most practices start clean and add active clients and projects directly. If you're migrating a large existing dataset, get in touch and we'll help plan it.",
  },
] as const;
