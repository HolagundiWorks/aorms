import Link from "next/link";
import type { Metadata } from "next";
import { Stack } from "@carbon/react";
import { listBlogPosts } from "../../lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on architecture practice management, billing, and building AORMS.",
  alternates: { canonical: "https://aorms.in/blog" },
};

/**
 * Minimal index — title, date, description, link. No tags, no categories,
 * no pagination (content/blog/ is a handful of files; revisit if that
 * changes). See lib/blog.ts's header comment for the full "no infra"
 * scoping.
 */
export default function BlogIndexPage() {
  const posts = listBlogPosts();

  return (
    <Stack gap={7}>
      <div>
        <p
          className="cds--type-productive-heading-01"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
        >
          AORMS Blog
        </p>
        <h1 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
          Notes on running an architecture practice.
        </h1>
      </div>
      <Stack gap={6}>
        {posts.map((post) => (
          <article key={post.slug} style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1.5rem" }}>
            <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              {post.date}
            </p>
            <h2 className="cds--type-productive-heading-03" style={{ marginTop: "0.25rem" }}>
              <Link href={`/blog/${post.slug}`} className="cds--link">
                {post.title}
              </Link>
            </h2>
            <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              {post.description}
            </p>
          </article>
        ))}
        {posts.length === 0 && (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            No posts yet.
          </p>
        )}
      </Stack>
    </Stack>
  );
}
