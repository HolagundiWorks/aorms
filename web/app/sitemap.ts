import type { MetadataRoute } from "next";
import { listBlogPosts } from "../lib/blog";
import { portalUrl } from "../lib/platform/subdomains";

/**
 * Next.js metadata-route convention — generates /sitemap.xml (2026-09-10,
 * pairs with the existing app/robots.ts, 2026-09-09). Lists only the
 * public marketing surface, matching robots.ts's own allow/disallow split
 * — every authenticated route is deliberately excluded, same reasoning as
 * that file's own header comment. Sitemap URLs must be absolute per the
 * spec, hence the hardcoded host here (robots.ts stays host-agnostic
 * since its rules work identically regardless of domain; a sitemap's URLs
 * don't).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://aorms.in";
  const now = new Date();

  const posts = listBlogPosts();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // ConnectDeX Partners' full marketing content, and the Legal route
    // group (2026-09-14) — added alongside the landing page changes that
    // introduced them: /connectdex-partners (moved off the landing
    // page's own #connectdex teaser), /privacy and /legal (new).
    { url: `${base}/connectdex-partners`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    // `${base}/login` deliberately NOT listed (2026-09-25 Search Console
    // audit, found by cross-checking this file against web/app/(auth)/
    // login/page.tsx): it's a pure redirect() to the identity.aorms.in URL
    // right below, in every environment that matters for indexing
    // (NODE_ENV === "production") — submitting a URL that immediately
    // redirects tells Google to index a page that isn't one, which is
    // exactly what Search Console's Coverage report flags as "Page with
    // redirect". List the real destination once, not the redirect twice.
    // Moved off the main domain onto their own subdomain (2026-09-10, see
    // lib/platform/subdomains.ts) — identity.aorms.in is the canonical
    // host these render at now, even though platform-login/-signup are
    // reachable from any of the three portal subdomains without a
    // redirect (see proxy.ts's SHARED_PREFIXES).
    { url: portalUrl("identity", "/platform-login"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: portalUrl("identity", "/platform-signup"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
