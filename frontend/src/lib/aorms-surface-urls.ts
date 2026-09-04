/**
 * Frozen AORMS surface URLs — office hub only (2026-09-04).
 * `aorms.in` = office hub + marketing. Firm portals = client/partner web.
 * Docs: docs/esti/AORMS-SURFACE-URLS.md
 */
export const AORMS_DOMAIN = "aorms.in" as const;

/** Path-only surfaces on the platform apex (aorms.in). */
export const AORMS_PLATFORM_PAGES = {
  externalAccess: { path: "/access", label: "External portals" },
  account: { path: "/account", label: "AORMS account" },
  companyAccount: { path: "/company-account", label: "Company account" },
  knowledgeBank: {
    path: "/libraries/knowledge-bank-portal",
    label: "Knowledge Bank portal",
  },
  login: { path: "/login", label: "AORMS office hub sign-in" },
} as const;

/** Subdomains retired 2026-07+ — nginx / client redirect to apex paths. */
export const LEGACY_SUBDOMAIN_HOSTS = [
  "external.aorms.in",
  "account.aorms.in",
  // Allied apps removed 2026-09
  "studio.aorms.in",
  "consultancy.aorms.in",
  "proc.aorms.in",
  "pmc.aorms.in",
] as const;

export const AORMS_SURFACES = {
  /** AORMS office hub + marketing — apex only. */
  platform: {
    id: "platform",
    label: "AORMS office hub",
    host: `https://${AORMS_DOMAIN}`,
    hostnames: [AORMS_DOMAIN, `www.${AORMS_DOMAIN}`] as const,
    loginPath: AORMS_PLATFORM_PAGES.login.path,
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

  // Legacy paths redirect to office hub home or login
  if (hostname === "external.aorms.in") {
    if (pathname === "/" || pathname === "") return `${apex}${AORMS_PLATFORM_PAGES.externalAccess.path}${q}`;
    return `${apex}${pathname}${q}`;
  }

  if (hostname === "account.aorms.in") {
    if (pathname === "/" || pathname === "") return `${apex}${AORMS_PLATFORM_PAGES.account.path}${q}`;
    return `${apex}${pathname}${q}`;
  }

  // Allied apps (studio, consultancy, proc, pmc) redirect to office hub login
  if (
    hostname === "studio.aorms.in" ||
    hostname === "consultancy.aorms.in" ||
    hostname === "proc.aorms.in" ||
    hostname === "pmc.aorms.in"
  ) {
    return `${apex}${AORMS_PLATFORM_PAGES.login.path}${q}`;
  }

  return null;
}

export function isPlatformHost(hostname?: string): boolean {
  const s = detectSurface(hostname);
  return s === "platform" || s === "unknown";
}

export function isAdminHost(hostname?: string): boolean {
  return detectSurface(hostname) === "admin";
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
