/**
 * Landing-page copy — seven boards around one project spine (2026-10-04, v2: 16 boards → 7).
 *
 * Every claim maps to something the app has today. Deliberately NOT claimed: a local/on-premises
 * install (AORMS is cloud-only — CLAUDE.md "web-only"), a tender "negotiation" step, ESTI answering
 * from meeting attendance. Documents-in-Drive is shown as "Coming soon", matching CONTROL_SECTION.
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
