import { notFound } from "next/navigation";
import { marked } from "marked";
import type { Metadata } from "next";
import { getBlogPost, listBlogPosts } from "../../../lib/blog";

/** Pre-renders every known post at build time — cheap (a handful of
 * files) and means a real 404 (see getBlogPost's own path-traversal
 * guard) never has to touch the filesystem on a live request for a
 * slug that was never one of ours. */
export function generateStaticParams() {
  return listBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://aorms.in/blog/${slug}` },
    openGraph: { title: post.title, description: post.description, url: `https://aorms.in/blog/${slug}`, type: "article" },
  };
}

/**
 * Renders one post's markdown to HTML via `marked` (see lib/blog.ts's
 * header comment for why that's a real dependency, not hand-rolled).
 * `dangerouslySetInnerHTML` is safe here specifically because the source
 * is a file this codebase wrote (content/blog/*.md), not user-submitted
 * content — the same trust boundary that makes it fine, not something
 * that would hold for markdown coming from a form or an API.
 */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const html = await marked.parse(post.content);

  return (
    <article>
      <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
        {post.date}
      </p>
      <h1 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
        {post.title}
      </h1>
      <div className="aorms-blog-content" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
