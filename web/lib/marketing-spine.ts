/**
 * Landing-page copy — seven boards around one project spine (2026-10-04, v2: 16 boards → 7).
 *
 * Every claim maps to something the app has today. Deliberately NOT claimed: a local/on-premises
 * install (AORMS is cloud-only — CLAUDE.md "web-only"), a tender "negotiation" step, ESTI answering
 * from meeting attendance. Documents-in-Drive is shown as "Coming soon", matching CONTROL_SECTION.
 *
 * 2026-10-09: eight boards — "Costing" (the AQC bridge) added. The bridge is in build: AORMS-side sign-in, sync store,
 * contractor inbox and client release exist; the AQC desktop client is not yet released. Every bridge item is therefore
 * badged "In build", never "Live" (docs/esti/AQC-CONNECT-PLAN.md § 8a). AQC itself is a separate Windows application —
 * there is no AORMS installer and no download link here.
 */

export const SPINE_HERO = {
  eyebrow: "AORMS · Architecture Operations & Resource Management System",
  display: "The operating system for\nan architecture practice.",
  connects: ["Projects", "People", "Site", "Accounts", "Tenders", "Knowledge"],
  statement: "One project spine. One connected practice.",
} as const;

export const SPINE_PROJECT = {
  display: "Everything starts\nwith the project.",
  lede: ["The project is one. The information is not.", "AORMS connects the information that makes a project."],
  stages: ["Brief", "Design", "Documentation", "Tender", "Site", "Handover"],
  dna: ["Client", "Site", "Scope", "Team", "Consultants", "Fees", "Stage", "Status"],
  foot: "The project becomes the permanent record of the work.",
} as const;

export const SPINE_OFFICE = {
  display: "The office, mapped\naround the project.",
  matrix: [
    { tag: "Projects", text: "Brief · Design · Tasks · Documents" },
    { tag: "Site", text: "Tasks · Measurements · Inspections · Issues" },
    { tag: "People", text: "Team · Consultants · Responsibilities" },
    { tag: "Accounts", text: "Fees · Billing · Recovery · Costs" },
    { tag: "Tender", text: "BOQ · Vendors · Comparison · Award" },
    { tag: "Knowledge", text: "Codes · Rates · Templates · Decisions" },
  ],
  foot: "Every part of the office connects back to the project.",
} as const;

export const SPINE_WORKFLOW = {
  display: "From information\nto action.",
  steps: [
    { tag: "Capture", text: "Brief · Meeting · Site · Drawing" },
    { tag: "Structure", text: "Project · Task · Document · Responsibility" },
    { tag: "Act", text: "Design · Tender · Site · Finance" },
    { tag: "Record", text: "Decision · Revision · Measurement · Payment" },
    { tag: "Remember", text: "Knowledge becomes part of the next project." },
  ],
} as const;

export const SPINE_MEMORY = {
  display: "The office remembers.",
  lede: ["Every project creates knowledge. AORMS keeps it connected to the work."],
  knowledge: ["Codes", "Details", "Specifications", "Rates", "Vendors", "Decisions", "Templates"],
  esti: "A project-aware assistant that works from your AORMS information.",
  questions: ["What changed in this project?", "What is pending?", "What was decided?", "Which consultant is responsible?"],
} as const;

/** The AQC bridge — estimation and costing happen in AQC; AORMS keeps and shows the result. */
export const SPINE_COSTING = {
  display: "Costed in AQC.\nKept with the project.",
  lede: [
    "AQC is the open-source estimation and costing tool made for this: quantities, bar schedules, rate books, estimates, running bills and the construction schedule.",
    "The AQC bridge connects it to your AORMS projects. Your AORMS login is the licence — nothing else to buy or register.",
  ],
  chips: ["Quantities", "Bar schedules", "Rate books", "Estimates", "Running bills", "Schedule"],
  steps: [
    { tag: "Sign in once", text: "Use your AORMS account. One active session per person." },
    { tag: "Open the project", text: "Pick an online project — its title block, parties and drawings arrive filled in. Or push a local project online." },
    { tag: "Work as you do today", text: "Everything you cost is saved to your practice's own database, one editor at a time." },
    { tag: "Release what clients see", text: "Estimates and schedules reach the client portal only when you release them." },
    { tag: "Contractor bills, certified", text: "Contractors submit running bills in the portal; you certify in AQC and the certified statement comes back." },
  ],
  status: "In build — not yet released. Until then AQC works on its own, and AORMS keeps its own project record.",
  community: "AQC stays free and open source on its own — Community needs no sign-in and sends nothing to AORMS.",
  plans: "The bridge is for studios on Studio and above.",
  foot: "Costing stays in the tool built for it. The project keeps the record.",
} as const;

export const SPINE_SYSTEM = {
  display: "Built around\nyour practice.",
  lede: ["AORMS is a cloud service: your records live under your own account, hosted in Mumbai, and stay yours to take with you."],
  rows: [
    { tag: "Web application", badge: "Live", text: "The AORMS workspace — remote access for multi-location teams." },
    { tag: "Database", badge: "Live", text: "Your practice's project data, row-level secured. A dedicated database is available." },
    { tag: "Documents", badge: "Coming soon", text: "Google Drive — AORMS keeps the structured record, not the file bytes." },
    { tag: "AI", badge: "Live", text: "ESTI, running on a self-hosted model. Connecting your own provider is on the roadmap." },
  ],
} as const;

export const SPINE_CTA = {
  display: "Build the office\naround the project.",
  lede: ["AORMS brings projects, people, information and decisions into one operating system for architecture practices."],
} as const;

/** Portals and in-app behaviours that now exist in the product — kept in step with the app (2026-10-04). */
export const SPINE_OUTSIDE = {
  tag: "Outside the office",
  portals: [
    { tag: "Client portal", text: "Clients see their own projects, approvals and updates — no staff login." },
    { tag: "Contractor portal", text: "Invited contractors submit sealed lump-sum bids on firm-issued tenders." },
    { tag: "Collaborator portal", text: "Consultants see only the projects and tasks they are engaged on." },
  ],
} as const;

export const SPINE_INAPP = {
  tag: "In the app",
  items: [
    { tag: "Numbered sheets", text: "Every screen is a numbered drawing sheet, with a nameplate to step through them." },
    { tag: "Pulse", text: "A daily brief written from your own records, with the day's KPIs beside it." },
    { tag: "Your view", text: "Lists as a table, as cards or as a board — one toolbar, same everywhere." },
    { tag: "Instructions", text: "Hint text on or off, per person — experts get a quieter screen." },
  ],
} as const;

/** The sample project shown on the landing page (matches the read-only live demo practice). */
export const SPINE_SAMPLE = {
  project: {
    id: "sample",
    ref: "DEMO-PRJ-04",
    title: "Lakeview Clubhouse Redevelopment",
    status: "ACTIVE",
    clientName: "Lakeview Residents Association",
    city: "Bengaluru",
    builtUpSqm: 640,
    siteSqm: 1100,
    floors: 3,
    tasksDone: 18,
    tasksTotal: 27,
  },
  phases: ["Concept", "Schematic", "Design", "Tender", "Build", "Handover"],
  currentPhase: 2,
  stats: [
    { value: 18, label: "Projects" },
    { value: 9, label: "Active", active: true },
    { value: 4, label: "Enquiries" },
  ],
  caption: "Sample data — the same components you see inside AORMS. Open the live demo to click through.",
} as const;

export const SPINE_SEO = {
  description:
    "AORMS is the operating system for an architecture practice — one project spine connecting projects, site, people, accounts, tenders and knowledge, with ESTI, a project-aware assistant, and a bridge to AQC for estimation and costing. Cloud-hosted in India.",
  keywords: [
    "architecture estimation and costing software",
    "AQC bridge",
    "architecture practice management software",
    "architecture practice operating system",
    "architecture firm management software India",
    "architect project management software",
    "architecture billing and fee tracking software",
    "architecture tender management software",
    "architecture site supervision software",
    "architecture knowledge management",
    "client portal for architects",
    "AORMS",
  ],
} as const;
