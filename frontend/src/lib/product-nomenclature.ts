/**
 * Product naming — office management system only (web-based hub).
 * Keep in sync with CLAUDE.md and docs/esti/AORMS-OFFICE-SYSTEM.md.
 * No allied apps: AStudio, AConsulting, AProc, ADraft, ShilpiDB, AORMS Connect (desktop) removed.
 */
import { platformPageUrl } from "./aorms-surface-urls.js";

/** AORMS Platform — unified office management system for architecture practices. */
export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Architecture Operations & Resource Management System",
  tagline: "The office management system for architecture practices",
  audience: "Architecture studios managing clients, projects, and delivery",
  heroHeadline: [
    "One unified office hub for architecture practices.",
    "Clients, projects, proposals, invoicing, team, and knowledge — all in one place.",
  ] as const,
  heroSupport:
    "For architects who manage projects, invoices, and teams with precision. Web-based, cloud-only.",
  aecDisciplines: ["Architecture"] as const,
  fragmentedTools: [
    "Email",
    "Spreadsheets",
    "Project management tools",
    "Messaging",
    "File sharing",
    "Accounting software",
    "Document storage",
  ] as const,
} as const;

/** The two framework layers every AORMS consulting office deploys. */
export const PLATFORM_FRAMEWORKS = {
  operational: {
    title: "Operational framework",
    summary:
      "How the consulting office runs — intake, process standards, review chains, audit trails, and governed knowledge.",
  },
  design: {
    title: "Design framework",
    summary:
      "How engagements are structured — methodologies, deliverable models, templates, and versioned advisory patterns.",
  },
} as const;

/** AORMS Office Hub — single unified web application (no suite, no desktop apps). */
export const AORMS_OFFICE_HUB = {
  slug: "aorms",
  title: "AORMS Office Hub",
  expansion: "AORMS — Office Management System",
  tagline: "Unified office management: clients, projects, proposals, invoicing, team, knowledge",
  appUrl: "https://aorms.in/login",
  loginPath: "/login",
  dashboardPath: "/",
  status: "active" as const,
} as const;

// Deprecated: All allied apps (Connect, AStudio, AConsulting, AProc, ADraft, ShilpiDB) removed 2026-09.
// Office hub is now the only product.

/** Portal and surface labels — office hub workspace and external portals. */
export const AORMS_PORTALS = {
  office: {
    title: "AORMS Office",
    navLabel: "Office",
    signInTitle: "AORMS Office sign-in",
    signInLink: "Sign in to AORMS Office",
    sessionLabel: "AORMS Office session",
    url: AORMS_OFFICE_HUB.appUrl,
  },
  client: { label: "Client portal" as const },
  consultant: {
    label: "Consultant portal" as const,
    alias: "Collaborator portal" as const,
  },
  contractor: { label: "Contractor portal" as const },
  site: { label: "Site portal" as const },
  external: {
    authTagline: `Firm portals · ${AORMS_PLATFORM.name} office communications`,
    signInIntro:
      "Sign in to your firm-branded client, consultant, contractor, or site portal — published updates only.",
    staffHint: "Office teams use the web-based AORMS hub (cloud-only, no desktop apps)",
    loginPageLink: "Client, consultant, contractor & site portals",
    marketingList: "Client, consultant, contractor, and site portals",
    stageHeadline: "External portal access",
    suiteEyebrow: `${AORMS_PLATFORM.name} office`,
    url: platformPageUrl("externalAccess"),
  },
  account: {
    name: "AORMS account",
    hubCaption: "Account & licensing",
    personal: "Personal account",
    company: "Company account",
    licensing: "Licensing console",
    manageLicence: "Manage your AORMS account & licence",
    create: "Create AORMS account",
    myAccount: "My AORMS account",
    stageHeadline: "AORMS account",
    stageSubline: "Identity, companies, and licence — managed in one place.",
    url: platformPageUrl("account"),
  },
  auth: {
    licensingHeadline: "Licensing console",
    licensingSubline: "Platform administration for Human Centric Works.",
  },
} as const;

/** External portal labels — lists, SEO, marketing tiles. */
export const EXTERNAL_PORTAL_LABELS = [
  AORMS_PORTALS.client.label,
  AORMS_PORTALS.consultant.label,
  AORMS_PORTALS.contractor.label,
  AORMS_PORTALS.site.label,
] as const;

/** Comma-separated external portal list for prose. */
export function externalPortalsPhrase(finalConjunction: "and" | "or" = "and"): string {
  const items = [...EXTERNAL_PORTAL_LABELS];
  if (items.length <= 1) return items[0] ?? "";
  const last = items.pop()!;
  return `${items.join(", ")}, ${finalConjunction} ${last.toLowerCase()}`;
}

/**
 * HCW License Manager — in-tree licensing authority (formerly the separate
 * `holagundi-license-panel` repo). Backend: `backend/src/licensing-platform/`
 * (`/platform`); UI: `frontend/src/platform-admin/` + `admin.html`.
 * Tables keep the `hlp_*` prefix. See docs/esti/HCW-LICENSE-MANAGER.md.
 */
export const HCW_LICENSE_MANAGER = {
  name: "HCW License Manager",
  shortName: "License Manager",
  consoleTitle: AORMS_PORTALS.account.licensing,
  apiPrefix: "/platform",
  consolePath: "/platform-admin",
  consoleHost: "admin.aorms.in",
  codename: "hlp",
  summary:
    "In-monorepo licence authority for AORMS — accounts, organisations, products, plans, keys, and the Product License API (/platform/v1).",
} as const;

/** Human Centric Works — operator / design studio behind AORMS. */
export const HUMAN_CENTRIC_WORKS = {
  legalName: "Human Centric Works",
  shortName: "HCW",
  attribution: "Developed by Human Centric Works",
  location: "Hospet, Karnataka, India",
  email: "hi@aorms.in",
  logoOnDark: "/hcw-white.png",
  logoOnLight: "/hcw-black.png",
} as const;

/** ESTI — built-in office automation AI agent. */
export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  role: "Internal AI agent",
  summary:
    "Built-in office automation — answers only from validated firm repositories; recommendations, insights, task automation, document generation.",
  workspace: "office",
} as const;

/** Knowledge Bank portal — PDF intake → validated firm library → ESTI RAG. */
export const KNOWLEDGE_BANK_PORTAL = {
  title: "Knowledge Bank portal",
  route: "/libraries/knowledge-bank-portal",
  url: platformPageUrl("knowledgeBank"),
  summary:
    "Governed reference library: HCW Markdown Tool converts PDFs to markdown; published sections are available to ESTI (Ask ESTI).",
} as const;

/** @deprecated Use KNOWLEDGE_BANK_PORTAL — kept for transitional imports. */
export const REPO_PORTAL = KNOWLEDGE_BANK_PORTAL;
