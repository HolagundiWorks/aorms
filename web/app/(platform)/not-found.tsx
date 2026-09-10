import { headers } from "next/headers";
import { RouteNotFound } from "../../components/aorms/RouteNotFound";
import { PORTAL_HOME, portalFromHost } from "../../lib/platform/subdomains";

/** Route-level 404 for the AORMS Platform — see RouteNotFound.tsx's own
 * comment; renders inside this group's own layout, so its header nav
 * stays visible. "Home" is whichever portal's subdomain actually 404'd
 * (2026-09-10) — a bad URL on connectdex.aorms.in should offer "Back to
 * My Company," not always "Back to My AORMS Identity". */
export default async function PlatformNotFound() {
  const portal = portalFromHost((await headers()).get("host"));
  const home = portal ? PORTAL_HOME[portal] : PORTAL_HOME.identity;
  const label = portal === "connectdex" ? "Back to My Company" : portal === "sysdex" ? "Back to SysDeX" : "Back to My AORMS Identity";
  return <RouteNotFound homeHref={home} homeLabel={label} />;
}
