/**
 * Landing-page copy for the "project spine" content hierarchy (2026-10-04).
 *
 * Positioning: AORMS is the operating system for an architecture practice, organised around one
 * project record ("the spine"). Every claim here maps to something the app has today (projects,
 * site snags/instructions/progress reports, tenders + contractor portal, invoices/expenses,
 * knowledge library, ESTI). Deliberately NOT claimed: a local/on-premises install (AORMS is
 * cloud-only — see CLAUDE.md "web-only"), a "negotiation" step in tenders, or attendance-aware
 * meeting answers from ESTI.
 */

export const SPINE_HERO = {
  eyebrow: "00 · The operating system for an architecture practice",
  display: "A project doesn't\nexist in isolation.",
  lede: [
    "AORMS connects the entire architecture practice around the project.",
    "Projects, people, documents, fees, sites, tenders and knowledge — connected through one project spine.",
  ],
  connects: ["Projects", "Site", "People", "Accounts", "Tenders", "Knowledge"],
  statement: "One project spine. One source of truth. Every stage connected.",
} as const;

export const SPINE_PROBLEM = {
  display: "The project is one.\nThe information is not.",
  lede: ["Architecture offices typically distribute project information across:"],
  scatter: ["WhatsApp", "Email", "Excel", "CAD", "PDF", "Google Drive", "Site registers", "Accounting software", "Personal notes"],
  point: "The problem isn't the amount of information. The problem is the distance between it.",
} as const;

export const SPINE_STAGES = {
  display: "One project.\nOne continuous record.",
  stages: ["Brief", "Feasibility", "Design", "Documentation", "Tender", "Construction", "Handover", "Maintenance"],
  body: "Every decision, document, task, measurement, fee, drawing, tender and site event remains connected to the project.",
} as const;

export const SPINE_MODULES = {
  display: "The office, mapped.",
  modules: [
    { tag: "Projects", text: "The project becomes the primary record." },
    { tag: "Site", text: "Capture what happens where the building is being made." },
    { tag: "Third parties", text: "Clients · consultants · contractors · vendors." },
    { tag: "Accounts", text: "Fees · expenses · receivables · project economics." },
    { tag: "HR", text: "People · roles · allocation · attendance · responsibilities." },
    { tag: "Tender", text: "BOQ · vendors · rates · comparisons · awards." },
    { tag: "Knowledge", text: "Codes · standards · office knowledge · previous decisions." },
  ],
  foot: "Every module feeds the same project.",
} as const;

export const SPINE_PROJECT = {
  display: "The project is\nthe interface.",
  lede: ["Open a project and everything relevant to that project is immediately available."],
  tabs: ["Project DNA", "Brief", "Team", "Consultants", "Drawings", "Tasks", "Site", "Measurements", "Tender", "Fees", "Documents", "Decisions", "Knowledge"],
} as const;

export const SPINE_DNA = {
  display: "Project DNA",
  lede: ["The permanent identity of the project."],
  fields: ["Client", "Site", "Project type", "Area", "Scope", "Consultants", "Contract", "Fees", "Stage", "Responsibilities", "Key dates", "Approvals", "Project status"],
  foot: "Everything else grows from the Project DNA.",
} as const;

export const SPINE_SITE = {
  display: "The drawing shows the intent.\nThe site shows the reality.",
  items: ["Site tasks", "Measurements", "Inspections", "Photographs", "Instructions", "Issues", "Decisions"],
  foot: "Record the site where the decision happened — not days later from memory.",
} as const;

export const SPINE_TENDER = {
  display: "From quantity\nto comparison.",
  flow: ["BOQ", "Invitation", "Vendor response", "Rate comparison", "Award", "Record"],
  foot: "Turn the tender process into a traceable project record.",
} as const;

export const SPINE_ACCOUNTS = {
  display: "Know what the\nproject is worth.",
  figures: ["Agreed fee", "Billed", "Received", "Outstanding", "Project cost", "Consultant cost"],
  foot: "Project information and project economics should not live in separate systems.",
} as const;

export const SPINE_KNOWLEDGE = {
  display: "The office remembers.",
  lede: ["Every completed project leaves knowledge behind."],
  items: ["Codes", "Details", "Specifications", "Rates", "Consultants", "Vendors", "Decisions", "Templates", "Lessons"],
  foot: "Build institutional memory without depending on individual memory.",
} as const;

export const SPINE_ESTI = {
  display: "The system knows what\nthe office knows.",
  lede: ["ESTI — a project-aware assistant for your practice. It answers from your own AORMS records, not the internet."],
  questions: [
    "What changed in the project last week?",
    "What was decided regarding the staircase?",
    "Which consultant is responsible for this item?",
    "What is pending on site?",
  ],
} as const;

export const SPINE_DATA = {
  display: "Your data.\nYour office.\nYour choice.",
  lede: ["AORMS is a cloud service: your practice's records live under your own account, hosted in Mumbai, and are yours to take with you."],
  rows: [
    { tag: "Shared workspace", badge: "Live", text: "Hosted in Mumbai (AWS ap-south-1), row-level secured per practice. Remote access for multi-location teams." },
    { tag: "Dedicated database", badge: "Available", text: "Practices that need full isolation can provision their own dedicated project." },
    { tag: "Your Google Drive", badge: "Coming soon", text: "Documents will live in your own Drive — AORMS keeps the structured record, not the file bytes." },
  ],
} as const;

export const SPINE_CTA = {
  display: "Build the office\naround the project.",
  lede: ["AORMS — Architecture Operations & Resource Management System.", "One project spine for the entire practice."],
} as const;
