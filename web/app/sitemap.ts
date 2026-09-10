import type { MetadataRoute } from "next";
import { listBlogPosts } from "../lib/blog";

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
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/platform-login`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/platform-signup`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
