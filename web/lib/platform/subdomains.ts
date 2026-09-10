/**
 * AORMS Platform subdomain routing (2026-09-10) — single source of truth
 * for which portal owns which path prefix, and how to build a link to
 * another portal. Used by web/proxy.ts (Edge runtime — this file must
 * stay edge-safe: no Node-only APIs, plain string/env logic only), and by
 * every Server Component/Action/page that links across portals.
 *
 * See docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals and
 * docs/esti/PLATFORM-SUBDOMAINS-DEPLOY.md for the full design/rollout.
 */

export type PortalKey = "identity" | "connectdex" | "sysdex";

/** Overridable for staging; defaults to the real production domain. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aorms.in";

/** Where a bare `https://<portal>.aorms.in/` redirects to. */
export const PORTAL_HOME: Record<PortalKey, string> = {
  identity: "/identity",
  connectdex: "/connectdex",
  sysdex: "/admin",
};

/**
 * Path prefixes each portal owns exclusively. A request for one of these
 * paths on the WRONG subdomain (or on the main domain) gets redirected to
 * the owning portal's subdomain — see proxy.ts. Order doesn't matter;
 * prefixes across portals never overlap.
 */
export const PORTAL_OWNED_PREFIXES: Record<PortalKey, string[]> = {
  identity: ["/identity", "/studios", "/licences"],
  connectdex: ["/connectdex", "/connectdex-apply", "/companies", "/materials"],
  sysdex: ["/admin"],
};

/**
 * Reachable identically on every portal subdomain AND the main domain,
 * with no redirect — signing in (or asking for help) shouldn't bounce you
 * off the portal you're already on.
 */
export const SHARED_PREFIXES = ["/platform-login", "/platform-signup", "/support"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Which portal (if any) owns this path. Null if it belongs to none of
 * the three (e.g. an Office Hub or marketing route). */
export function ownerOf(pathname: string): PortalKey | null {
  for (const key of Object.keys(PORTAL_OWNED_PREFIXES) as PortalKey[]) {
    if (matchesPrefix(pathname, PORTAL_OWNED_PREFIXES[key])) return key;
  }
  return null;
}

export function isSharedPath(pathname: string): boolean {
  return matchesPrefix(pathname, SHARED_PREFIXES);
}

/** Absolute https://<portal>.aorms.in<path> — for every cross-portal
 * link (a link from one portal's pages, or the main domain, into
 * another's). Same-portal links stay plain relative NextLinks. */
export function portalUrl(portal: PortalKey, path = ""): string {
  return `https://${portal}.${ROOT_DOMAIN}${path}`;
}

/**
 * Given an incoming request's Host header, which portal subdomain (if
 * any) is it? Null for the main domain or an unrecognized host.
 */
export function portalFromHost(host: string | null): PortalKey | null {
  const hostname = (host ?? "").split(":")[0];
  return (Object.keys(PORTAL_HOME) as PortalKey[]).find((key) => hostname === `${key}.${ROOT_DOMAIN}`) ?? null;
}

/**
 * Where a post-auth redirect (sign in/up/out) should land: the current
 * portal's own home if the request came from one of the three
 * subdomains, otherwise Identity (the same default the old hardcoded
 * `redirect("/identity")` always used).
 */
export function resolvePortalHomeFromHost(host: string | null): string {
  const portal = portalFromHost(host);
  return portal ? PORTAL_HOME[portal] : PORTAL_HOME.identity;
}
