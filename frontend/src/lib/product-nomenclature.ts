/**
 * Product naming — keep in sync with docs/esti/AORMS-PLATFORM-NOMENCLATURE.md
 * and docs/esti/AORMS-SUITE.md.
 * Suite: Connect (core) + managers (AStudio · AConsulting) + AQC Estimation/BBS/PM + AADT + ShilpiDB.
 */
import { platformPageUrl } from "./aorms-surface-urls.js";
export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Accelerated Operational Resources Management System",
  /** Platform scope — AEC consulting suite (2026-08). */
  tagline: "The operating suite for AEC consulting and project management firms",
  audience:
    "AEC consulting firms and project management consultancies — architecture, engineering, and PMC practices that advise and govern projects",
  /** Platform home hero — no third-party product names. */
  heroHeadline: [
    "From disconnected tools to one operating suite:",
    "Managers online for communications; technical work stays local.",
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
 * The AORMS suite apps.
 * Core: AORMS Connect. Managers: AStudio · AConsulting. Technical: AProc/AQC-PM · Estimation · BBS. Drafting: AADT.
 * Legacy marketing names AORMS-Studio / AORMS-Consultancy / AORMS-PMC redirect.
 */
export const AORMS_APPS = {
  connect: {
    slug: "aorms-connect",
    legacySlugs: ["connect"] as const,
    title: "AORMS Connect",
    expansion: "AORMS suite core",
    discipline: "Suite core",
    role: "suite_core" as const,
    packageId: "in.aorms.connect",
    tagline:
      "Suite core — sign in once, launch every app, shared projects, installer links",
    audience: "Every AORMS firm — the desktop entry point for the suite",
    appUrl: "https://aorms.in/downloads",
    marketingPath: "/downloads",
    landingHref: "/#connect",
    wikiPath: "/wiki",
    status: "preview" as const,
  },
  studio: {
    slug: "astudio",
    legacySlugs: ["aorms-studio", "hived", "aorms-architecture"] as const,
    title: "AStudio",
    expansion: "Accelerated Studio",
    /** @deprecated Prefer title + expansion — kept for transitional copy. */
    legacyTitle: "AORMS-Studio",
    discipline: "Architecture",
    role: "practice_manager" as const,
    tagline: "Accelerated Studio — architecture practice manager (tasks, office, HR, portals)",
    audience: "Indian architecture and interior design consultancies",
    appUrl: "https://aorms.in/downloads",
    /** Desktop host when installers ship (soft launch: downloads Coming soon). */
    desktopHostUrl: "https://studio.aorms.in",
    /** @deprecated Use studio.aorms.in — app.aorms.in redirects at nginx. */
    legacyAppUrl: "https://app.aorms.in",
    marketingPath: "/downloads",
    landingHref: "/#studio",
    wikiPath: "/wiki/astudio",
    wikiName: "AStudio docs",
    status: "preview" as const,
  },
  consultancy: {
    slug: "aconsulting",
    legacySlugs: ["aorms-consultancy"] as const,
    title: "AConsulting",
    expansion: "Accelerated Consulting",
    legacyTitle: "AORMS-Consultancy",
    marketingAlias: "AConsultancy",
    discipline: "Engineering",
    role: "practice_manager" as const,
    tagline: "Accelerated Consulting — engineering practice manager",
    audience:
      "Structural, MEP, civil, and multidisciplinary engineering consultancies advising on built-environment projects",
    appUrl: "https://aorms.in/downloads",
    desktopHostUrl: "https://consultancy.aorms.in",
    marketingPath: "/downloads",
    legacyMarketingPath: "/aorms-consultancy",
    landingHref: "/#consultancy",
    wikiPath: "/wiki/aconsulting",
    status: "preview" as const,
  },
  pmc: {
    slug: "aproc",
    legacySlugs: ["aorms-pmc", "pmc", "aqc-pm"] as const,
    title: "AProc",
    expansion: "Accelerated Project Management",
    legacyTitle: "AORMS-PMC",
    suiteTitle: "AQC Project Management",
    discipline: "Project management",
    role: "technical" as const,
    tagline: "AQC Project Management — programme, packages, and site certification (desktop)",
    audience:
      "Project management consultancies that plan, coordinate, and certify delivery on behalf of clients — programme, packages, and site governance",
    appUrl: "https://aorms.in/downloads",
    desktopHostUrl: "https://proc.aorms.in",
    marketingPath: "/downloads",
    legacyMarketingPath: "/aorms-pmc",
    landingHref: "/#pmc",
    wikiPath: "/wiki/aproc",
    status: "preview" as const,
  },
  estimation: {
    slug: "aqc-estimation",
    legacySlugs: [] as const,
    title: "AQC Estimation",
    expansion: "Accelerated Quantity and Costing — Estimation",
    discipline: "Quantity / costing",
    role: "technical" as const,
    tagline: "Rate books, BOQ, and measurement — local engine, published totals only",
    audience: "Quantity surveyors and estimators in AEC consultancies",
    appUrl: "https://aorms.in/downloads",
    marketingPath: "/downloads",
    landingHref: "/#estimation",
    wikiPath: "/wiki/aqc",
    status: "preview" as const,
  },
  bbs: {
    slug: "aqc-bbs",
    legacySlugs: [] as const,
    title: "AQC BBS",
    expansion: "Accelerated Quantity and Costing — BBS",
    discipline: "Bar bending",
    role: "technical" as const,
    tagline: "Bar bending schedules and steel reconciliation — local engine",
    audience: "Structural detailing and site steel teams",
    appUrl: "https://aorms.in/downloads",
    marketingPath: "/downloads",
    landingHref: "/#bbs",
    wikiPath: "/wiki/aqc",
    status: "preview" as const,
  },
  aadt: {
    slug: "aadt",
    legacySlugs: [] as const,
    title: "AADT",
    expansion: "Accelerated Architectural Drafting",
    discipline: "Drafting",
    role: "drafting" as const,
    tagline: "2D CAD drafting — geometry in ShilpiDB",
    audience: "Architects and drafters",
    appUrl: "https://github.com/HolagundiWorks/AADT",
    marketingPath: "/downloads",
    landingHref: "/#aadt",
    wikiPath: "/wiki",
    status: "preview" as const,
  },
} as const;

/** Suite core — login · launcher · catalog. */
export const AORMS_CONNECT = AORMS_APPS.connect;

/** Architecture app — this monorepo (Indian architecture consultancies). */
export const AORMS_STUDIO = AORMS_APPS.studio;
/** @deprecated Prefer ASTUDIO — same object. */
export const ASTUDIO = AORMS_APPS.studio;

/** Engineering consultancy app. */
export const AORMS_CONSULTANCY = AORMS_APPS.consultancy;
export const ACONSULTING = AORMS_APPS.consultancy;

/** Project management consultancy app (PMC) — AQC Project Management installer. */
export const AORMS_PMC = AORMS_APPS.pmc;
export const APROC = AORMS_APPS.pmc;
export const AQC_ESTIMATION = AORMS_APPS.estimation;
export const AQC_BBS = AORMS_APPS.bbs;
export const AADT = AORMS_APPS.aadt;

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

/** Platform landing — suite map (core + managers + technical + drafting). */
export const PLATFORM_APPS = [
  {
    id: "connect",
    status: AORMS_CONNECT.status,
    kind: "suite_core" as const,
    title: AORMS_CONNECT.discipline,
    workspace: AORMS_CONNECT.title,
    expansion: AORMS_CONNECT.expansion,
    subtitle: "Suite core · login & launcher",
    body:
      "Sign in once, launch AStudio, AConsulting, and AQC apps, keep projects consistent, and open installer links. Licence Manager surface comes later.",
    bullets: [
      "Single firm login (SSO for the suite)",
      "Launcher · shared project catalog",
      "DB connector · installer links",
    ],
    workspaceSlug: AORMS_CONNECT.slug,
    href: AORMS_CONNECT.appUrl,
    cta: "Downloads — coming soon",
  },
  {
    id: "studio",
    status: AORMS_STUDIO.status,
    kind: "manager" as const,
    title: AORMS_STUDIO.discipline,
    workspace: AORMS_STUDIO.title,
    expansion: AORMS_STUDIO.expansion,
    subtitle: "Practice manager · architecture",
    body:
      "Tasks, office, HR, payroll, and client portals for architecture practices. Technical calc stays in AQC apps; drafting in AADT. Launch from Connect.",
    bullets: [
      "Tasks · Office · HR · Payroll",
      "Client & third-party communications",
      "Portal publish controls",
    ],
    workspaceSlug: AORMS_STUDIO.slug,
    href: AORMS_STUDIO.appUrl,
    cta: "Downloads — coming soon",
  },
  {
    id: "consultancy",
    status: AORMS_CONSULTANCY.status,
    kind: "manager" as const,
    title: AORMS_CONSULTANCY.discipline,
    workspace: AORMS_CONSULTANCY.title,
    expansion: AORMS_CONSULTANCY.expansion,
    subtitle: "Practice manager · engineering",
    body:
      "Same practice-manager surface for engineering consultancies — engagements, deliverables, and governed communications. Launch from Connect.",
    bullets: [
      "Engagements · RACI · deliverables",
      "Timesheets · office docs",
      "Portal communications",
    ],
    workspaceSlug: AORMS_CONSULTANCY.slug,
    href: AORMS_CONSULTANCY.appUrl,
    cta: "Downloads — coming soon",
  },
  {
    id: "pmc",
    status: AORMS_PMC.status,
    kind: "technical" as const,
    title: AORMS_PMC.discipline,
    workspace: AORMS_PMC.suiteTitle ?? AORMS_PMC.title,
    expansion: AORMS_PMC.expansion,
    subtitle: "Technical · programme & site",
    body:
      "AQC Project Management (AProc) — programme, packages, RA and site certification. Desktop technical app; portals show published progress only.",
    bullets: [
      "Programme · packages · RA",
      "Shared bbs_engine",
      "Published milestones to portals",
    ],
    workspaceSlug: AORMS_PMC.slug,
    href: AORMS_PMC.appUrl,
    cta: "Downloads — coming soon",
  },
] as const;

/** Technical + drafting suite tiles (landing secondary row). */
export const SUITE_TECHNICAL_APPS = [
  {
    id: "estimation",
    status: AQC_ESTIMATION.status,
    workspace: AQC_ESTIMATION.title,
    expansion: AQC_ESTIMATION.expansion,
    subtitle: "Technical · quantities",
    body: AQC_ESTIMATION.tagline,
    href: AQC_ESTIMATION.appUrl,
    repo: "https://github.com/HolagundiWorks/AQC-Estimation",
    cta: "Downloads",
  },
  {
    id: "bbs",
    status: AQC_BBS.status,
    workspace: AQC_BBS.title,
    expansion: AQC_BBS.expansion,
    subtitle: "Technical · steel",
    body: AQC_BBS.tagline,
    href: AQC_BBS.appUrl,
    repo: "https://github.com/HolagundiWorks/AQC-BBS",
    cta: "Downloads",
  },
  {
    id: "pm",
    status: AORMS_PMC.status,
    workspace: AORMS_PMC.suiteTitle,
    expansion: AORMS_PMC.expansion,
    subtitle: "Technical · programme & site",
    body: AORMS_PMC.tagline,
    href: AORMS_PMC.appUrl,
    repo: "https://github.com/HolagundiWorks/AQC-PM",
    cta: "Open AProc",
  },
  {
    id: "aadt",
    status: AADT.status,
    workspace: AADT.title,
    expansion: AADT.expansion,
    subtitle: "Drafting · 2D CAD",
    body: AADT.tagline,
    href: AADT.appUrl,
    repo: "https://github.com/HolagundiWorks/AADT",
    cta: "GitHub",
  },
] as const;

/** Suite core tiles (landing — before practice managers). */
export const SUITE_CORE_APPS = PLATFORM_APPS.filter((a) => a.kind === "suite_core");

/** Practice-manager tiles only (landing primary app row). */
export const SUITE_MANAGER_APPS = PLATFORM_APPS.filter((a) => a.kind === "manager");

export const SHILPIDB = {
  name: "ShilpiDB",
  expansion: "Spatial vector drawing store",
  role: "Geometry spine",
  summary:
    "Shared drawing database across the suite — .vdb codec, spatial index, shilpid server, and shilpi-http for portals.",
  url: "https://github.com/HolagundiWorks/shilpidb",
} as const;

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
    authTagline: `Firm portals · ${AORMS_PLATFORM.name} suite communications`,
    signInIntro:
      "Sign in to your firm-branded client, consultant, contractor, or site portal — published updates only.",
    staffHint: `Office teams use desktop ${AORMS_STUDIO.title} / ${AORMS_CONSULTANCY.title}`,
    loginPageLink: "Client, consultant, contractor & site portals",
    marketingList: "Client, consultant, contractor, and site portals",
    stageHeadline: "External portal access",
    suiteEyebrow: `${AORMS_PLATFORM.name} suite`,
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
