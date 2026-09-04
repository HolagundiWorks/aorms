/** Cross-page links for the marketing top ribbon (not in-page section anchors). */
export type MarketingRailIcon =
  | "platform"
  | "architecture"
  | "consultancy"
  | "wiki"
  | "downloads"
  | "about"
  | "legal"
  | "design-system";

export type MarketingPageLink = {
  href: string;
  label: string;
  icon: MarketingRailIcon;
};

// Platform landing + downloads are the live public marketing surfaces.
// Wiki / about / legal / per-app marketing pages remain consolidated to `/`.
export const MARKETING_RAIL_PAGES: readonly MarketingPageLink[] = [
  { href: "/", label: "Home", icon: "platform" },
  { href: "/downloads", label: "Downloads", icon: "downloads" },
] as const;

export const MARKETING_WIKI_RAIL_PAGES: readonly MarketingPageLink[] = MARKETING_RAIL_PAGES;

export function railPageLinkIsActive(href: string, pathname: string, hash = ""): boolean {
  const url = new URL(href, "https://aorms.local");
  const path = url.pathname || "/";
  const linkHash = url.hash.replace(/^#/, "");

  if (path === "/downloads") return pathname === "/downloads" || pathname === "/download";
  if (path === "/wiki") return pathname === "/wiki" || pathname.startsWith("/wiki/");
  if (path === "/" && linkHash) {
    if (pathname !== "/") return false;
    const current = hash.replace(/^#/, "");
    if (linkHash === "platform") return !current || current === "platform" || current === "top";
    return current === linkHash;
  }
  return pathname === path && !linkHash;
}
