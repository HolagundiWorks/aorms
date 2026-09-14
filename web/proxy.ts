import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { ROOT_DOMAIN, PORTAL_HOME, isSharedPath, ownerOf, portalFromHost } from "./lib/platform/subdomains";

/**
 * AORMS Platform subdomain routing (2026-09-10) — see
 * lib/platform/subdomains.ts and docs/esti/PLATFORM-SUBDOMAINS-DEPLOY.md.
 * Runs before the existing session-refresh pass: a redirect here means
 * there's no point refreshing a session for a request we're about to
 * send elsewhere.
 *
 * On a portal subdomain (identity/connectdex/sysdex.aorms.in), only that
 * portal's own paths and the shared login/signup/support paths are ever
 * served — everything else either belongs to a different portal (bounce
 * there) or belongs to neither (an Office Hub or marketing route; bounce
 * back to the main domain, which is the only host that actually serves
 * those). Without this, `identity.aorms.in/dashboard` would silently
 * serve the Office Hub's dashboard — same build, same route tree,
 * nothing else stops it.
 *
 * On the main domain, a path a portal owns (the old in-path URLs, e.g.
 * `aorms.in/identity`, already live in production before this date)
 * redirects to that portal's subdomain — keeps old bookmarks/indexed
 * links working.
 *
 * Production only. A real browser (unlike curl, which can fake a Host
 * header while still connecting to 127.0.0.1) has to actually resolve
 * `identity.aorms.in` etc. via DNS to navigate there — which it can't,
 * locally — so without this gate, local dev would 404/hang on every
 * single portal path the moment this redirect fires. Local dev keeps
 * serving `/identity`, `/connectdex`, `/admin` etc. directly at their
 * real path, exactly as before this feature existed. The redirect logic
 * itself is unchanged and was verified via `curl -H "Host: ..."`
 * against this same dev server with this gate temporarily lifted — see
 * docs/esti/ROADMAP.md's dated entry for that account.
 */
/**
 * 2026-09-14 — critical bug fix, found live in production (every one of
 * these redirects was landing on an unreachable URL): `request.url`/
 * `request.nextUrl` reflect the *internal* socket Hostinger's reverse
 * proxy forwards requests to (port 3000), not the public
 * `https://<host>` the visitor's browser actually connected to. Every
 * redirect below used to derive its target from `request.url` — `new
 * URL(request.url)` then only reassigning `hostname`, or `new URL(path,
 * request.url)` — which silently carried that internal `:3000` straight
 * into the `Location` header sent back to the browser (confirmed via
 * `curl -sI https://aorms.in/admin`: `location: https://sysdex.aorms.in
 * :3000/admin`, an address nothing public can reach). This broke every
 * portal-owned path reached from the main domain — `/identity`,
 * `/studios`, `/licences`, `/connectdex`, `/connectdex-apply`,
 * `/companies`, `/materials`, `/admin` — for any visitor who landed on
 * `aorms.in` directly rather than already being on the right subdomain
 * (an old bookmark, a shared link, or simply not knowing about the
 * subdomain split, which is the common case, not an edge one). Fixed by
 * building every redirect target from scratch — explicit `https:`
 * protocol, explicit empty `port`, host and path assembled directly from
 * `ROOT_DOMAIN`/the current path/query — never carrying `request.url`'s
 * own origin forward at all.
 */
function portalRedirectUrl(hostname: string, pathname: string, search: string): URL {
  const target = new URL(`https://${hostname}${pathname}${search}`);
  target.port = "";
  return target;
}

function routePortalSubdomains(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const currentPortal = portalFromHost(request.headers.get("host"));
  const { pathname, search } = request.nextUrl;

  if (currentPortal) {
    if (pathname === "/") {
      return NextResponse.redirect(portalRedirectUrl(`${currentPortal}.${ROOT_DOMAIN}`, PORTAL_HOME[currentPortal], ""));
    }
    const owner = ownerOf(pathname);
    if (owner === currentPortal || isSharedPath(pathname)) {
      return null;
    }
    const hostname = owner ? `${owner}.${ROOT_DOMAIN}` : ROOT_DOMAIN;
    return NextResponse.redirect(portalRedirectUrl(hostname, pathname, search));
  }

  const mainDomainOwner = ownerOf(pathname);
  if (mainDomainOwner) {
    return NextResponse.redirect(portalRedirectUrl(`${mainDomainOwner}.${ROOT_DOMAIN}`, pathname, search));
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const routed = routePortalSubdomains(request);
  if (routed) return routed;

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
