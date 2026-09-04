/**
 * AORMS blog — single post. Rendered from App.tsx's publicMarketing early
 * return for any `/blog/:slug` path (not react-router matched), so the slug
 * is read straight off the location rather than via useParams.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Column, Grid, Tag } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { AormsLogo } from "../components/AormsLogo.js";
import { AORMS_PLATFORM, HUMAN_CENTRIC_WORKS } from "../lib/product-nomenclature.js";
import { applyPublicPageSeo, applyPublicNotFoundSeo } from "../lib/public-page-seo.js";
import { getBlogPost, type BlogBlock } from "../lib/blog-posts.js";

const PAGE_MAX = 760;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="cds--type-productive-heading-03" style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
          {block.text}
        </h2>
      );
    case "list":
      return (
        <ul className="cds--type-body-01" style={{ marginTop: "1rem", marginBottom: "1rem", paddingLeft: "1.25rem", color: "var(--cds-text-secondary)" }}>
          {block.items.map((item) => (
            <li key={item} style={{ marginBottom: "0.5rem" }}>
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote
          style={{
            margin: "1.5rem 0",
            padding: "0.25rem 0 0.25rem 1.25rem",
            borderLeft: "3px solid var(--cds-border-strong)",
          }}
        >
          <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)", fontStyle: "italic" }}>
            {block.text}
          </p>
          {block.cite ? (
            <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-placeholder)" }}>
              — {block.cite}
            </p>
          ) : null}
        </blockquote>
      );
    case "p":
    default:
      return (
        <p className="cds--type-body-02" style={{ marginTop: "1rem", color: "var(--cds-text-secondary)" }}>
          {block.text}
        </p>
      );
  }
}

export function BlogPost() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/blog\//, "").replace(/\/+$/, "");
  const post = getBlogPost(slug);

  useEffect(() => {
    if (post) {
      applyPublicPageSeo({
        title: `${post.title} — ${AORMS_PLATFORM.name} Blog`,
        description: post.dek,
        path: `/blog/${post.slug}`,
      });
    } else {
      applyPublicNotFoundSeo("Post");
    }
  }, [post]);

  if (!post) {
    return (
      <MarketingNeuFrame>
        <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "4rem 1rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              <h1 className="cds--type-heading-05">Post not found</h1>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                This post doesn't exist, or moved.
              </p>
              <a href="/blog" className="cds--link" style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <ArrowLeft size={16} /> Back to the blog
              </a>
            </Column>
          </Grid>
        </div>
      </MarketingNeuFrame>
    );
  }

  return (
    <MarketingNeuFrame>
      <article style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "3rem 1rem 6rem" }}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <a href="/blog" className="cds--link" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <ArrowLeft size={16} /> Blog
            </a>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
              <span
                className="cds--type-code-01"
                aria-hidden
                style={{ border: "1px solid var(--cds-border-strong)", padding: "0.0625rem 0.375rem", color: "var(--cds-text-secondary)" }}
              >
                {post.sheet}
              </span>
              <span className="cds--type-caption-01" style={{ color: "var(--cds-text-placeholder)" }}>
                {formatDate(post.date)} · {post.readingMinutes} min read
              </span>
            </div>
            <h1 className="cds--type-heading-05" style={{ marginTop: "0.75rem" }}>
              {post.title}
            </h1>
            <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
              {post.dek}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              {post.tags.map((t) => (
                <Tag key={t} type="outline" size="sm">
                  {t}
                </Tag>
              ))}
            </div>

            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "0.5rem" }}>
              {post.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>

            <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
              <AormsLogo variant="md" />
              <p className="cds--type-caption-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
              </p>
              <a href="/blog" className="cds--link" style={{ marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <ArrowLeft size={16} /> More posts
              </a>
            </footer>
          </Column>
        </Grid>
      </article>
    </MarketingNeuFrame>
  );
}
