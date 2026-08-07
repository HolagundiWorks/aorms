/**
 * Frozen AORMS surface URLs — revised 2026-08-07 (desktop-native pivot).
 * `aorms.in` = marketing + demos. Staff ERP = desktop apps. Firm portals =
 * client/partner web. Docs: docs/esti/AORMS-SURFACE-URLS.md
 */
export const AORMS_DOMAIN = "aorms.in" as const;

/** Path-only surfaces on the platform apex (aorms.in). */
export const AORMS_PLATFORM_PAGES = {
  wiki: { path: "/wiki", label: "AORMS Wiki" },
  downloads: { path: "/downloads", label: "Downloads" },
  externalAccess: { path: "/login?tab=portals", label: "External portals" },
  account: { path: "/account", label: "AORMS account" },
  companyAccount: { path: "/company-account", label: "Company account" },
  knowledgeBank: {
    path: "/libraries/knowledge-bank-portal",
    label: "Knowledge Bank portal",
  },
  studioLogin: { path: "/login", label: "Demo sign-in (not firm ERP)" },
  /** Path alias on apex; canonical marketing host is consultancy.aorms.in. */
  consultancyMarketing: { path: "/aconsulting", label: "AConsulting" },
  /** Legacy path — redirects to /aconsulting. */
  consultancyMarketingLegacy: { path: "/aorms-consultancy", label: "AConsulting" },
  /** Path alias on apex; canonical host is proc.aorms.in. */
  pmcMarketing: { path: "/aproc", label: "AProc" },
  pmcMarketingLegacy: { path: "/aorms-pmc", label: "AProc" },
} as const;

/** Subdomains retired 2026-07 — nginx / client redirect to apex paths. */
export const LEGACY_SUBDOMAIN_HOSTS = [
  "wiki.aorms.in",
  "kbank.aorms.in",
  "external.aorms.in",
  "account.aorms.in",
] as const;

export const AORMS_SURFACES = {
  /** Platform marketing + path-based pages — apex only. */
  platform: {
    id: "platform",
    label: "AORMS platform",
    host: `https://${AORMS_DOMAIN}`,
    hostnames: [AORMS_DOMAIN, `www.${AORMS_DOMAIN}`] as const,
  },
  /** AStudio marketing host (staff app is desktop). */
  studio: {
    id: "studio",
    label: "AStudio",
    host: `https://studio.${AORMS_DOMAIN}`,
    hostnames: [`studio.${AORMS_DOMAIN}`, `app.${AORMS_DOMAIN}`] as const,
    legacyRedirectFrom: [`app.${AORMS_DOMAIN}`] as const,
    loginPath: AORMS_PLATFORM_PAGES.studioLogin.path,
  },
  /** AConsulting marketing host (staff app is desktop). */
  consultancy: {
    id: "consultancy",
    label: "AConsulting",
    host: `https://consultancy.${AORMS_DOMAIN}`,
    hostnames: [`consultancy.${AORMS_DOMAIN}`] as const,
    marketingPath: AORMS_PLATFORM_PAGES.consultancyMarketing.path,
  },
  /** AQC / AProc marketing host. */
  pmc: {
    id: "pmc",
    label: "AProc",
    host: `https://proc.${AORMS_DOMAIN}`,
    hostnames: [`proc.${AORMS_DOMAIN}`, `pmc.${AORMS_DOMAIN}`] as const,
    marketingPath: AORMS_PLATFORM_PAGES.pmcMarketing.path,
  },
  /** HCW licensing console (platform admin). */
  admin: {
    id: "admin",
    label: "Licensing console",
    host: `https://admin.${AORMS_DOMAIN}`,
    hostnames: [`admin.${AORMS_DOMAIN}`] as const,
  },
} as const;

export type AormsSurfaceId = keyof typeof AORMS_SURFACES;

const HOST_TO_SURFACE = new Map<string, AormsSurfaceId>();
for (const [id, surface] of Object.entries(AORMS_SURFACES)) {
  for (const h of surface.hostnames) HOST_TO_SURFACE.set(h, id as AormsSurfaceId);
}

/** Resolve which frozen surface this hostname belongs to. */
export function detectSurface(
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
): AormsSurfaceId | "unknown" {
  const exact = HOST_TO_SURFACE.get(hostname);
  if (exact) return exact;
  if (/^admin\./.test(hostname)) return "admin";
  if (/^(proc|pmc)\./.test(hostname)) return "pmc";
  return "unknown";
}

/** 301 target for retired subdomains → aorms.in pages. */
export function legacySubdomainRedirectUrl(
  hostname: string,
  pathname: string,
  search = "",
  hash = "",
): string | null {
  const apex = AORMS_SURFACES.platform.host;
  const q = `${search}${hash}`;
  switch (hostname) {
    case "wiki.aorms.in":
      if (pathname === "/" || pathname === "") return `${apex}${AORMS_PLATFORM_PAGES.wiki.path}${q}`;
      if (pathname.startsWith(AORMS_PLATFORM_PAGES.wiki.path))
        return `${apex}${pathname}${q}`;
      return `${apex}${AORMS_PLATFORM_PAGES.wiki.path}${pathname}${q}`;
    case "kbank.aorms.in":
      return `${apex}${AORMS_PLATFORM_PAGES.knowledgeBank.path}${q}`;
    case "external.aorms.in":
      if (pathname === "/" || pathname === "") return `${apex}${AORMS_PLATFORM_PAGES.externalAccess.path}${q}`;
      return `${apex}${pathname}${q}`;
    case "account.aorms.in":
      if (pathname === "/" || pathname === "") return `${apex}${AORMS_PLATFORM_PAGES.account.path}${q}`;
      return `${apex}${pathname}${q}`;
    default:
      return null;
  }
}

export function isStudioHost(hostname?: string): boolean {
  return detectSurface(hostname) === "studio";
}

export function isPlatformHost(hostname?: string): boolean {
  const s = detectSurface(hostname);
  return s === "platform" || s === "unknown";
}

export function isAdminHost(hostname?: string): boolean {
  return detectSurface(hostname) === "admin";
}

export function isConsultancyHost(hostname?: string): boolean {
  return detectSurface(hostname) === "consultancy";
}

export function isPmcHost(hostname?: string): boolean {
  return detectSurface(hostname) === "pmc";
}

/** Absolute URL for a subdomain surface + optional path. */
export function surfaceAbsoluteUrl(surfaceId: AormsSurfaceId, path = "/"): string {
  const base = AORMS_SURFACES[surfaceId].host.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? base : `${base}${p}`;
}

/** Absolute URL for a path-only page on aorms.in. */
export function platformPageUrl(
  page: keyof typeof AORMS_PLATFORM_PAGES,
  subpath = "",
): string {
  const base = AORMS_SURFACES.platform.host.replace(/\/+$/, "");
  const root = AORMS_PLATFORM_PAGES[page].path;
  if (!subpath) return `${base}${root}`;
  const suffix = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${base}${root}${suffix}`;
}

/**
 * Platform marketing home — `/` on aorms.in, absolute apex URL on studio/other hosts
 * (studio `/` redirects to `/login`).
 */
export function platformHomeHref(
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
): string {
  return isPlatformHost(hostname) ? "/" : surfaceAbsoluteUrl("platform");
}

/** All production origins that must appear in ALLOWED_ORIGINS (cookie CSRF). */
export const AORMS_ALLOWED_ORIGINS = Array.from(
  new Set(
    Object.values(AORMS_SURFACES).flatMap((s) =>
      ("hostnames" in s ? s.hostnames : []).map((h) => `https://${h}`),
    ),
  ),
);

/** Comma-separated ALLOWED_ORIGINS value for deploy .env files. */
export const AORMS_ALLOWED_ORIGINS_CSV = AORMS_ALLOWED_ORIGINS.join(",");
