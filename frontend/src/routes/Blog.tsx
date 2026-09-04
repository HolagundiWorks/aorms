/**
 * AORMS blog — index. Pure Carbon, same drawing-set voice as the landing
 * page. Public marketing surface: see App.tsx's publicMarketing routing.
 */
import { useEffect } from "react";
import { Column, Grid, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { AormsLogo } from "../components/AormsLogo.js";
import { AORMS_PLATFORM, HUMAN_CENTRIC_WORKS } from "../lib/product-nomenclature.js";
import { applyPublicPageSeo } from "../lib/public-page-seo.js";
import { blogPostsByDate } from "../lib/blog-posts.js";

const PAGE_MAX = 1000;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function Blog() {
  useEffect(() => {
    applyPublicPageSeo({
      title: `Blog — ${AORMS_PLATFORM.name}`,
      description:
        "How AORMS actually works, for the architects running the practice: fee recovery, GST/TDS on invoices, COA fee-scale enforcement, and the built-in AI agent.",
      path: "/blog",
    });
  }, []);

  const posts = blogPostsByDate();

  return (
    <MarketingNeuFrame>
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "3rem 1rem 6rem" }}>
        <Grid>
          <Column sm={4} md={8} lg={12} style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                className="cds--type-code-01"
                aria-hidden
                style={{ border: "1px solid var(--cds-border-strong)", padding: "0.0625rem 0.375rem", color: "var(--cds-text-secondary)" }}
              >
                B-00 · BLOG
              </span>
              <Tag type="green" size="sm">
                Live
              </Tag>
            </div>
            <h1 className="cds--type-heading-06" style={{ marginTop: "1rem" }}>
              Notes from building an office hub for architects
            </h1>
            <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
              How {AORMS_PLATFORM.name} actually works — fee recovery, GST/TDS mechanics, COA
              scale enforcement, and the built-in AI agent — written by the people building it,
              for the architects running the practice.
            </p>
          </Column>

          {posts.map((post) => (
            <Column key={post.slug} sm={4} md={8} lg={16} style={{ marginBottom: "1.5rem" }}>
              <a
                href={`/blog/${post.slug}`}
                className="cds--link"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  borderTop: "1px solid var(--cds-border-subtle)",
                  paddingTop: "1.5rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="cds--type-code-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {post.sheet}
                  </span>
                  <span className="cds--type-caption-01" style={{ color: "var(--cds-text-placeholder)" }}>
                    {formatDate(post.date)} · {post.readingMinutes} min read
                  </span>
                </div>
                <h2 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {post.title}
                </h2>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", maxWidth: 720, color: "var(--cds-text-secondary)" }}>
                  {post.dek}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  {post.tags.map((t) => (
                    <Tag key={t} type="outline" size="sm">
                      {t}
                    </Tag>
                  ))}
                </div>
                <p className="cds--type-body-01" style={{ marginTop: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  Read <ArrowRight size={16} />
                </p>
              </a>
            </Column>
          ))}
        </Grid>

        <footer style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={4} lg={6}>
              <AormsLogo variant="md" />
              <p className="cds--type-caption-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
              </p>
            </Column>
            <Column sm={4} md={4} lg={6}>
              <a href="/" className="cds--link">
                Back to {AORMS_PLATFORM.name}
              </a>
            </Column>
          </Grid>
        </footer>
      </div>
    </MarketingNeuFrame>
  );
}
