import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { portalFromHost } from "../lib/platform/subdomains";

/**
 * Next.js metadata-route convention — generates /robots.txt (2026-09-09
 * hosting-prep audit — neither robots.txt nor this existed before). Blocks
 * every authenticated surface (office hub, all three external portals, the
 * platform identity app) and leaves the public marketing pages (`/`,
 * `/blog` if/when it ships here) crawlable.
 *
 * Host-aware since 2026-09-10: identity/connectdex/sysdex.aorms.in each
 * get a flat `disallow: "/"` — no SEO value on any of the three portal
 * subdomains, same posture as the rest of the authenticated app — while
 * the main domain keeps the list below (now minus the five entries that
 * moved off it onto their own subdomains: /identity, /companies,
 * /studios, /licences, /materials — they no longer resolve here at all,
 * see proxy.ts).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const portal = portalFromHost((await headers()).get("host"));
  if (portal) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // One entry per top-level segment actually routed under app/(app)/,
      // app/(portal|collab-portal|contractor-portal)/, and app/(platform)/'s
      // authenticated pages — enumerated straight from the app/ directory
      // listing (route groups add no path segment of their own, so there's
      // no single prefix to disallow). Login/signup pages under (auth) and
      // (platform) stay crawlable on purpose. Re-check this list whenever a
      // new top-level route segment is added.
      disallow: [
        "/ai-runs",
        "/approvals",
        "/audit-log",
        "/bbs",
        "/clients",
        "/compliance",
        "/consultants",
        "/contractors",
        "/contracts",
        "/dashboard",
        "/document-issues",
        "/drawings",
        "/estimates",
        "/firm-settings",
        "/invoices",
        "/job-applications",
        "/knowledge-bank",
        "/leads",
        "/lessons",
        "/letters",
        "/master-plans",
        "/moms",
        "/office-templates",
        "/payslips",
        "/pmc-milestones",
        "/pmc-packages",
        "/pmc-ra-bills",
        "/pmc-steel-certs",
        "/progress-reports",
        "/projects",
        "/proposals",
        "/purchase-orders",
        "/rate-books",
        "/reports",
        "/site-instructions",
        "/snags",
        "/spec-catalog",
        "/spec-sheets",
        "/standards",
        "/takeoff",
        "/tasks",
        "/team-members",
        "/teams",
        "/tenders",
        "/transmittals",
        "/users",
        "/workload",
        "/portal",
        "/collab-portal",
        "/contractor-portal",
        "/api",
      ],
    },
  };
}
