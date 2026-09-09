import type { MetadataRoute } from "next";

/**
 * Next.js metadata-route convention — generates /robots.txt (2026-09-09
 * hosting-prep audit — neither robots.txt nor this existed before). Blocks
 * every authenticated surface (office hub, all three external portals, the
 * platform identity app) and leaves the public marketing pages (`/`,
 * `/blog` if/when it ships here) crawlable. Written host-agnostically — no
 * hardcoded aorms.in — since as of this date `web/`'s landing page is not
 * yet the live production site (see CLAUDE.md § Stack migration; that's
 * still the `frontend/` package's job), so this may first serve from a
 * staging/preview host before any DNS cutover. The disallow list stays
 * correct either way.
 */
export default function robots(): MetadataRoute.Robots {
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
        "/identity",
        "/companies",
        "/studios",
        "/licences",
        "/materials",
        "/api",
      ],
    },
  };
}
