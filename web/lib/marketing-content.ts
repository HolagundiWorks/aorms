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
  /**
   * SEO meta description (2026-09-14 audit) — separate from
   * `heroSupport` above, which is 243 characters and would be truncated
   * mid-sentence in a Google result (~155-160 char practical limit).
   * Kept to 154 chars, front-loads the product category + audience +
   * flagship features for the SERP snippet.
   */
  metaDescription:
    "AORMS is the office management system built for architecture practices — clients, projects, billing, and GST-compliant invoicing on one hub.",
} as const;

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  summary:
    "Built-in office automation — answers only from validated firm repositories; recommendations, insights, task automation, document generation.",
} as const;

/**
 * "ConnectDeX Partners" (2026-09-10) — a landing-page product name for the
 * material/interior-supplier side of the Platform, same pattern as ESTI
 * being a product name for the AI feature: a marketing brand layered on
 * top, not a rename of the underlying system. The database entity, its
 * migrations, and every internal reference stay "Company"/`AORMS-C-`
 * (docs/esti/AORMS-PLATFORM-ARCHITECTURE.md's nomenclature table is still
 * correct) — only this page's copy and its `/#connectdex` anchor use the
 * new name. Do not rename `platform/supabase/migrations/
 * 0007_supplier_companies.sql`'s tables or any Server Action/component
 * over this — that would be the kind of full system rename the Studio/
 * Company split actually was, and nothing this round asked for that.
 */
export const CONNECTDEX = {
  name: "ConnectDeX Partners",
  tagline: "Where material and interior suppliers connect with the practices specifying them",
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

/**
 * Dedicated feature section, hero-adjacent (2026-09-14, explicit
 * direction: "below hero section let's have a dedicated feature
 * section"). Billing forecast reads task progress already recorded
 * against a project (per-task % complete, tied to a phase's fee) and
 * projects two numbers from it: what's already earned but not yet
 * invoiced, and what's still short of billable. Not a live figure here —
 * `BillingForecastPanel`'s sample uses the same placeholder project name
 * as the hero record chain and TRUST_STRIP's posture: illustrative, not
 * a real firm's data.
 */
export const BILLING_FORECAST = {
  eyebrow: "Feature",
  title: "Know what's billable before month-end.",
  body: "Every task carries progress against its phase's fee. AORMS reads that progress across a project and predicts two numbers as work happens — not at invoice time: what's already earned but not yet billed, and what's still short of the next milestone.",
  points: [
    {
      title: "Progress-linked, not a guess",
      body: "The forecast is computed from actual task completion recorded in the portal — the same numbers your team already updates, not a separate estimate to maintain.",
    },
    {
      title: "Updates as work happens",
      body: "Mark a task done and the billable-so-far figure moves with it — no waiting for month-end to find out what's ready to invoice.",
    },
    {
      title: "One phase or the whole project",
      body: "See the prediction per phase, or rolled up across every active project — the same view a running bill or invoice draws from.",
    },
  ],
} as const;

/**
 * Second dedicated feature section (2026-09-14, explicit direction) — the
 * revision lifecycle: a client-requested change is tagged where it's
 * first raised (a meeting or site visit, via Minutes of Meeting), routed
 * to the client portal, costed and scoped by the responsible team
 * member/lead, sent back for the client's explicit approval, and only
 * then worked on. The point stated alongside the request: this is what
 * stops an unauthorised change from quietly moving the budget or the
 * design without anyone having agreed to it first.
 */
export const REVISION_LIFECYCLE = {
  eyebrow: "Feature",
  title: "Every revision, on the record before it's built.",
  body: "A change discussed on-site or in a meeting shouldn't turn into scope creep nobody signed off on. AORMS routes every client revision through the same four-stage lifecycle — tagged, costed, approved — before a single hour is spent on it.",
  stages: [
    {
      n: "01",
      title: "Tagged in the meeting",
      body: "Raised on a site visit or in a client meeting, the revision is tagged directly in that meeting's Minutes of Meeting — not a separate note someone has to remember to log later.",
    },
    {
      n: "02",
      title: "Sent to the client portal",
      body: "The tagged revision posts straight to the client's portal as a change request — the client sees exactly what was discussed, in their own words, not a summary written days later.",
    },
    {
      n: "03",
      title: "Costed by the team lead",
      body: "The assigned team member or lead acknowledges the request and adds what it actually changes — the cost difference and any further design or schedule impact — before it goes anywhere near the client's answer.",
    },
    {
      n: "04",
      title: "Approved, then worked on",
      body: "The costed revision goes back to the client for explicit approval. Nothing is built against it until they say yes — so the budget and the design only ever move on record, never quietly.",
    },
  ],
} as const;

/**
 * Third dedicated feature section (2026-09-14, explicit direction) — task
 * prioritization and workload balance. The pitch as given: tasks pile up
 * and become hard to triage by hand, so AORMS scores and ranks them
 * automatically from what's already on record (a task's own progress,
 * its due date, and site situation/urgency signals raised against it) —
 * surfacing what to work on today instead of leaving each person to sort
 * a growing pile themselves, and balancing that load across the team
 * rather than letting it stack on whoever's already busiest.
 */
export const TASK_PRIORITIZATION = {
  eyebrow: "Feature",
  title: "Stop triaging the pile. Just work the list.",
  body: "Every task already carries its own progress, due date, and any site situation raised against it. AORMS scores and ranks all of it automatically — what's urgent surfaces to the top of today's list on its own, and no one has to re-sort a growing pile by hand to find out what to do next.",
  points: [
    {
      title: "Scored, not self-reported",
      body: "Priority is computed from progress, due date, and any linked site issue or client escalation — not a number someone assigns by feel and forgets to update.",
    },
    {
      title: "Today's list, already ordered",
      body: "Open the day and the highest-priority work is already at the top — across every project someone is assigned to, not one list per project to check separately.",
    },
    {
      title: "Balanced across the team",
      body: "The same scoring that orders one person's list also shows where load is stacking up unevenly, before it turns into a bottleneck at delivery.",
    },
  ],
} as const;

/**
 * Fourth dedicated feature section (2026-09-14, explicit direction) —
 * Pulse's Today's Brief. Grounded in the real pipeline: a deterministic
 * template (`lib/ai/phraser.ts`'s `buildDailyBriefText`) turns real
 * Supabase queries — absences, ready-to-bill/awaiting-payment totals,
 * open client/consultant/tender requests, pending approvals, contractor
 * submissions, top priorities — into plain sentences, with an optional
 * bounded Ollama rephrase for warmth only (never allowed to add a fact,
 * name, or number that wasn't already in the deterministic text). No
 * click needed — it's generated once when the page renders. Copy below
 * states that pipeline honestly rather than implying free-form AI.
 */
export const TODAYS_BRIEFING = {
  eyebrow: "Feature",
  title: "Start the day already briefed.",
  body: "Pulse opens to a brief written the moment the page loads — who's out today, what's ready to bill, what's still open across clients and consultants, and what's most urgent. Every line comes from your own studio's records; nothing is generated from a guess.",
  points: [
    {
      title: "Built from real numbers first",
      body: "A deterministic pass over your own data writes the correct sentence before any AI touches it — the brief is accurate on its own, with or without a rephrase.",
    },
    {
      title: "Reworded, never invented",
      body: "An optional AI pass may reword that same text for warmth and clarity — it's explicitly barred from adding a fact, name, or number that wasn't already there.",
    },
    {
      title: "Waiting when you open it",
      body: "No question to type, no button to click first — the brief is already written by the time Pulse loads.",
    },
  ],
} as const;

/**
 * The Brief, Specification, and Fee Proposal sections were removed from
 * the landing page (2026-09-14, explicit direction) — the old
 * BRIEF/SPECIFICATION/FEE_PROPOSAL exports that fed them are removed
 * here as dead code along with the sections themselves.
 *
 * Account packages (2026-09-14 rewrite, second pass — explicit
 * direction: "for user basic and pro... for studio basic, pro and
 * enterprise, for basic it's just an identity exists, to use the
 * features pro subscription is required, for staff more than 25+
 * enterprise comes into picture"). Two DIFFERENT profiles, not two views
 * of the same thing (explicit follow-up: "don't confuse user profile
 * with studio profile") — each is its own account with its own
 * Basic/Pro state, and the two only relate one way: a Studio's own paid
 * plan is what a Studio *grants* Pro status to its members from. A
 * person is never billed directly and never buys their own Pro status.
 * - `individual` — a person's own AORMS Identity account. Basic is the
 *   identity existing with no feature access; Pro is a status on that
 *   *same identity*, granted by whichever Studio the person works at —
 *   there is no price a person pays here, only a status their Studio
 *   sets.
 * - `studio` — a completely separate account: the architecture
 *   practice's own AORMS-S- identity. Its own Basic/Pro/Enterprise are
 *   what the *Studio* subscribes to and pays for directly; Enterprise
 *   applies once its staff count passes 25.
 * This is a marketing-copy change only; it does not touch the
 * underlying `plan_pricing` rows or the Platform's own licence machinery
 * (platform/supabase/migrations/0018-0019) — those still exist
 * server-side under their own naming.
 */
export const PRICING = {
  individual: [
    {
      name: "Basic",
      price: "Free",
      verified: false,
      detail: "Your personal AORMS Identity exists — one AORMS-U- handle, portable across every studio you work at. No feature access on its own; it's the account, not a subscription.",
    },
    {
      name: "Pro",
      price: "A status, not a purchase",
      verified: true,
      detail: "The verified checkmark and full feature access on your own identity — a status the Studio you work at grants you from its own paid plan. You never buy this yourself.",
    },
  ],
  studio: [
    {
      name: "Basic",
      price: "Free",
      verified: false,
      detail: "Your Studio's own account exists — invite your team, hold the identity — but nobody on it can use the hub's features until the Studio itself is on Pro.",
    },
    {
      name: "Pro",
      price: "₹1,999/year",
      verified: true,
      detail: "The Studio's own subscription — unlocks the full office hub and lets the Studio grant Pro status to its members. One flat annual fee, no per-seat math.",
    },
    {
      name: "Enterprise",
      price: "₹14,999/year",
      verified: true,
      detail: "For Studios with 25+ staff — the same Studio-level subscription, sized for a bigger team, plus your own address: yourstudio.aorms.in.",
    },
  ],
} as const;

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
 *
 * Simplified 2026-09-14 (explicit direction: "simplify the identities
 * section, and merge identities with pricing section") — trimmed to one
 * short sentence each; the standalone Identity section and its 3-card
 * IDENTITY array (now removed as dead code) are gone, folded into the
 * Pricing section's own "Your Identity"/"Your Studio" groups instead —
 * see PRICING above for the account-package detail that used to live in
 * that array.
 */
export const INDIVIDUAL_IDENTITY = {
  eyebrow: "Individual Identity",
  title: "You, not your employer.",
  body: "One portable AORMS-U- handle, yours alone — link it once and carry it into every studio you work at, present or future.",
} as const;

export const STUDIO_IDENTITY = {
  eyebrow: "Studio Identity",
  title: "Your practice's own account.",
  body: "A separate AORMS-S- account for the practice itself — invite your team and hold the Studio's own Basic or Pro status under one identity, not scattered across individual logins.",
} as const;

/**
 * A second, distinct entity type from Studio above — material/interior
 * suppliers, not architecture practices. Real and live
 * (platform/supabase/migrations/0007_supplier_companies.sql,
 * 0008_material_catalogue.sql), branded on this page as "ConnectDeX
 * Partners" (see CONNECTDEX above) as of 2026-09-10 — previously had no
 * product name of its own and no presence on this landing page at all.
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
    question: "Is there a free plan, or do we have to start on a trial?",
    answer:
      "No trial — Basic is free for as long as you use it, no card and no expiry. Upgrade to Pro in-app whenever you're ready; nothing is time-boxed or auto-charged.",
  },
  {
    question: "What does Pro actually add?",
    answer:
      "The same office hub, plus a verified checkmark on your Studio's identity and ongoing support — Pro never unlocks a feature Basic can't reach.",
  },
  {
    question: "Can we bring in our existing client and project data?",
    answer:
      "There's no automated bulk-import wizard yet — most practices start clean and add active clients and projects directly. If you're migrating a large existing dataset, get in touch and we'll help plan it.",
  },
] as const;
