/**
 * Product naming — keep in sync with docs/esti/AORMS-PLATFORM-NOMENCLATURE.md.
 * Platform: AORMS. Apps: AStudio · AConsulting · AProc.
 */
import { platformPageUrl } from "./aorms-surface-urls.js";
export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Accelerated Operational Resources Management System",
  /** Platform scope — AEC consulting + PMC (2026-07). */
  tagline: "The operating system for AEC consulting and project management firms",
  audience:
    "AEC consulting firms and project management consultancies — architecture, engineering, and PMC practices that advise and govern projects",
  /** Platform home hero — no third-party product names. */
  heroHeadline: [
    "From disconnected tools to one operating system:",
    "Built for architecture, engineering, and PMC consultancies.",
  ] as const,
  aecDisciplines: ["Architecture", "Engineering", "Project management"] as const,
  fragmentedTools: [
    "Messaging",
    "Team communication",
    "Advisory workflows",
    "Documentation",
    "Email",
    "Sheets",
    "File sharing",
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

/**
 * The three AORMS apps.
 * Display names: AStudio · AConsulting · AProc (Accelerated …).
 * Legacy marketing names AORMS-Studio / AORMS-Consultancy / AORMS-PMC redirect.
 */
export const AORMS_APPS = {
  studio: {
    slug: "astudio",
    legacySlugs: ["aorms-studio", "hived", "aorms-architecture"] as const,
    title: "AStudio",
    expansion: "Accelerated Studio",
    /** @deprecated Prefer title + expansion — kept for transitional copy. */
    legacyTitle: "AORMS-Studio",
    discipline: "Architecture",
    tagline: "Accelerated Studio — architecture consultancy workspace for Indian practices",
    audience: "Indian architecture and interior design consultancies",
    appUrl: "https://studio.aorms.in",
    /** @deprecated Use studio.aorms.in — app.aorms.in redirects at nginx. */
    legacyAppUrl: "https://app.aorms.in",
    marketingPath: "/login",
    landingHref: "/#studio",
    wikiPath: "/wiki/astudio",
    wikiName: "AStudio docs",
    status: "live" as const,
  },
  consultancy: {
    slug: "aconsulting",
    legacySlugs: ["aorms-consultancy"] as const,
    title: "AConsulting",
    expansion: "Accelerated Consulting",
    legacyTitle: "AORMS-Consultancy",
    discipline: "Engineering",
    tagline: "Accelerated Consulting — engineering consultancy workspace",
    audience:
      "Structural, MEP, civil, and multidisciplinary engineering consultancies advising on built-environment projects",
    appUrl: "https://consultancy.aorms.in",
    marketingPath: "/aconsulting",
    legacyMarketingPath: "/aorms-consultancy",
    landingHref: "/#consultancy",
    wikiPath: "/wiki/aconsulting",
    status: "live" as const,
  },
  pmc: {
    slug: "aproc",
    legacySlugs: ["aorms-pmc", "pmc"] as const,
    title: "AProc",
    expansion: "Accelerated Project Management",
    legacyTitle: "AORMS-PMC",
    discipline: "Project management",
    tagline: "Accelerated Project Management — PMC workspace for project management consultancies",
    audience:
      "Project management consultancies that plan, coordinate, and certify delivery on behalf of clients — programme, packages, and site governance",
    appUrl: "https://proc.aorms.in",
    marketingPath: "/aproc",
    legacyMarketingPath: "/aorms-pmc",
    landingHref: "/#pmc",
    wikiPath: "/wiki/aproc",
    status: "preview" as const,
  },
} as const;

/** Architecture app — this monorepo (Indian architecture consultancies). */
export const AORMS_STUDIO = AORMS_APPS.studio;
/** @deprecated Prefer ASTUDIO — same object. */
export const ASTUDIO = AORMS_APPS.studio;

/** Engineering consultancy app. */
export const AORMS_CONSULTANCY = AORMS_APPS.consultancy;
export const ACONSULTING = AORMS_APPS.consultancy;

/** Project management consultancy app (PMC). */
export const AORMS_PMC = AORMS_APPS.pmc;
export const APROC = AORMS_APPS.pmc;

/** Legacy single slug — prefer {@link AORMS_STUDIO.legacySlugs}. */
export const AORMS_STUDIO_LEGACY_SLUG = AORMS_STUDIO.legacySlugs[0];

export function isAormsStudioLegacySlug(slug: string): boolean {
  return (AORMS_STUDIO.legacySlugs as readonly string[]).includes(slug);
}

export function isAormsConsultancyLegacySlug(slug: string): boolean {
  return (
    slug === AORMS_CONSULTANCY.slug ||
    (AORMS_CONSULTANCY.legacySlugs as readonly string[]).includes(slug)
  );
}

export function isAormsPmcLegacySlug(slug: string): boolean {
  return (
    slug === AORMS_PMC.slug || (AORMS_PMC.legacySlugs as readonly string[]).includes(slug)
  );
}

/** Platform landing — three AEC apps on one spine. */
export const PLATFORM_APPS = [
  {
    id: "studio",
    status: AORMS_STUDIO.status,
    title: AORMS_STUDIO.discipline,
    workspace: AORMS_STUDIO.title,
    expansion: AORMS_STUDIO.expansion,
    subtitle: "Architecture consultancies",
    body:
      "Indian architecture and design consultancies — operational and design frameworks for fees, revisions, statutory compliance, drawings, and studio intelligence.",
    bullets: [
      "COA fee proposals & GST invoicing",
      "Drawing register & transmittals",
      "ESTI · internal AI agent · Ask ESTI",
    ],
    workspaceSlug: AORMS_STUDIO.slug,
    href: AORMS_STUDIO.appUrl,
    cta: `Open ${AORMS_STUDIO.title}`,
  },
  {
    id: "consultancy",
    status: AORMS_CONSULTANCY.status,
    title: AORMS_CONSULTANCY.discipline,
    workspace: AORMS_CONSULTANCY.title,
    expansion: AORMS_CONSULTANCY.expansion,
    subtitle: "Engineering consultancies",
    body:
      "Structural, MEP, civil, and multidisciplinary engineering consultancies — engagement frameworks, review chains, deliverable models, and governed knowledge for advisory work.",
    bullets: [
      "Engagement & deliverable frameworks",
      "Serial review & sign-off chains",
      "EOMS · knowledge bank · codes & compliance on tap",
    ],
    workspaceSlug: AORMS_CONSULTANCY.slug,
    href: AORMS_CONSULTANCY.appUrl,
    cta: `Open ${AORMS_CONSULTANCY.title}`,
  },
  {
    id: "pmc",
    status: AORMS_PMC.status,
    title: AORMS_PMC.discipline,
    workspace: AORMS_PMC.title,
    expansion: AORMS_PMC.expansion,
    subtitle: "Project management consultancies",
    body:
      "PMC firms that govern programme, packages, and site certification for clients — accelerated project management on the same AORMS spine, without becoming a contractor ERP.",
    bullets: [
      "Programme (CSV / P6 XER milestones) & packages",
      "BBS, steel recon & RA certification",
      "Contractor portal bids · client delivery oversight",
    ],
    workspaceSlug: AORMS_PMC.slug,
    href: AORMS_PMC.appUrl,
    cta: `Open ${AORMS_PMC.title}`,
  },
] as const;

/**
 * Portal and surface labels — staff workspace, external portals, account hub.
 * Staff workspace brand is **AStudio** (never "AORMS portal"). External portals
 * keep the word *portal*; they are scoped to AStudio today.
 */
export const AORMS_PORTALS = {
  studio: {
    title: AORMS_STUDIO.title,
    navLabel: AORMS_STUDIO.title,
    signInTitle: `${AORMS_STUDIO.title} sign-in`,
    signInLink: `Sign in to ${AORMS_STUDIO.title}`,
    sessionLabel: `${AORMS_STUDIO.title} session`,
    railFallback: AORMS_STUDIO.title,
    url: AORMS_STUDIO.appUrl,
  },
  client: { label: "Client portal" as const },
  consultant: {
    label: "Consultant portal" as const,
    alias: "Collaborator portal" as const,
  },
  contractor: { label: "Contractor portal" as const },
  site: { label: "Site portal" as const },
  external: {
    authTagline: `Client, consultant, contractor & site portals · ${AORMS_STUDIO.title}`,
    signInIntro:
      "Sign in to your client, consultant, contractor, or site portal.",
    staffHint: `Office team members use ${AORMS_STUDIO.title} sign-in`,
    loginPageLink: "Client, consultant, contractor & site portals",
    marketingList: "Client, consultant, contractor, and site portals",
    stageHeadline: "External portal access",
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

/**
 * HCW License Manager — in-tree licensing authority (formerly the separate
 * `holagundi-license-panel` repo). Backend: `backend/src/licensing-platform/`
 * (`/platform`); UI: `frontend/src/platform-admin/` + `admin.html`.
 * Tables keep the `hlp_*` prefix. See docs/esti/HCW-LICENSE-MANAGER.md.
 */
export const HCW_LICENSE_MANAGER = {
  name: "HCW License Manager",
  shortName: "License Manager",
  /** Operator-facing console label (same as AORMS_PORTALS.account.licensing). */
  consoleTitle: AORMS_PORTALS.account.licensing,
  apiPrefix: "/platform",
  consolePath: "/platform-admin",
  consoleHost: "admin.aorms.in",
  /** Schema / session codename — do not rename tables or cookies. */
  codename: "hlp",
  summary:
    "In-monorepo licence authority for AORMS — accounts, organisations, products, plans, keys, and the Product License API (/platform/v1).",
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

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  /** Internal AI agent — firm-bound RAG, cognition, and workspace intelligence. */
  role: "Internal AI agent",
  summary:
    "Internal AI agent — answers only from validated firm repositories; cognition engine, Ask ESTI, Studio Intelligence, and ESTI Pulse.",
  workspace: AORMS_STUDIO.slug,
} as const;

/** Knowledge Bank portal — EOMS textbook intake → validated firm library → ESTI RAG. */
export const KNOWLEDGE_BANK_PORTAL = {
  title: "Knowledge Bank portal",
  route: "/libraries/knowledge-bank-portal",
  url: platformPageUrl("knowledgeBank"),
  summary:
    "Governed reference library: HCW Markdown Tool converts PDFs to markdown; EOMS rephrases and summarises; published sections are available to ESTI (Ask ESTI).",
} as const;

/** @deprecated Use KNOWLEDGE_BANK_PORTAL — kept for transitional imports. */
export const REPO_PORTAL = KNOWLEDGE_BANK_PORTAL;

/**
 * EOMS — the continuously-learning knowledge bank. A standalone API in its own
 * repository (not the `esti` monorepo) that catalogs standard codebooks and
 * building/compliance codes; AORMS apps and the native tools query it to
 * retrieve authoritative code and data.
 */
export const EOMS = {
  name: "EOMS",
  expansion: "Emergent Object Management System",
  role: "Knowledge bank (standalone API)",
  /** Lives in a separate repository, consumed over its API. */
  external: true,
  hosts: ["Standard codebooks", "Building compliance", "Other compliance codes"] as const,
  summary:
    "The continuously-learning knowledge bank — a standalone API that ingests, catalogs, and serves standard codebooks and building/compliance codes so a specific code or dataset can be retrieved on demand. AORMS apps and the native tools query EOMS; ESTI answers only from the firm's own validated repositories.",
} as const;
