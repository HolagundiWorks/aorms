import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Accordion, AccordionItem, Column, Grid, Tag, Tile } from "@carbon/react";
import { createClient } from "../lib/supabase/server";
import { roleHome } from "../lib/auth/role-home";
import { listBlogPosts } from "../lib/blog";
import { BandCtas, ConnectDexCtas, HeroCtas, IdentityCtas } from "../components/aorms/LandingButtons";
import { LandingHeader } from "../components/aorms/LandingHeader";
import { HeroFloatingNotices } from "../components/aorms/HeroFloatingNotices";
import {
  AORMS_PLATFORM,
  BRIEF,
  COMPANY_IDENTITY,
  CONNECTDEX,
  DEMO,
  ESTI,
  FAQ,
  FEE_PROPOSAL,
  HUMAN_CENTRIC_WORKS,
  IDENTITY,
  INDIVIDUAL_IDENTITY,
  SPECIFICATION,
  STUDIO_IDENTITY,
  TRUST_STRIP,
} from "../lib/marketing-content";

const PAGE_MAX = 1200;
const SECTION_PAD = "clamp(3rem, 6vw, 6rem) 0";

export const metadata: Metadata = {
  title: AORMS_PLATFORM.heroHeadline,
  description: AORMS_PLATFORM.heroSupport,
  alternates: { canonical: "https://aorms.in/" },
  openGraph: { title: AORMS_PLATFORM.heroHeadline, description: AORMS_PLATFORM.heroSupport, url: "https://aorms.in/" },
};

/**
 * JSON-LD structured data (2026-09-10) — SoftwareApplication, the schema.org
 * type that fits an office-management SaaS product better than the more
 * generic Organization type alone. Kept to fields actually true today: no
 * `aggregateRating`/`review` (no public reviews exist to cite) and no
 * `offers.price` (the per-seat rates are still unconfirmed placeholders
 * pending review on /admin/pricing — see lib/marketing-content.ts's own
 * header comment on why no price appears anywhere on this page yet).
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: AORMS_PLATFORM.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: AORMS_PLATFORM.heroSupport,
  url: "https://aorms.in/",
  offers: { "@type": "Offer", availability: "https://schema.org/InStock" },
  publisher: {
    "@type": "Organization",
    name: HUMAN_CENTRIC_WORKS.legalName,
    email: HUMAN_CENTRIC_WORKS.email,
  },
};

/**
 * web/'s public marketing landing page — this route was a bare auth
 * redirect until Phase-8-era work first built it out (see the "not part
 * of the migration spec" cross-cutting rows in ROADMAP-CLOUD.md: nothing
 * in `web/` ever served a marketing surface before that). Content was a
 * trimmed port of frontend/src/routes/Landing.tsx's copy, rebuilt here in
 * stock `@carbon/react` only, matching CLAUDE.md's Pure Carbon rule
 * `web/` already follows everywhere else, rather than porting the old
 * page's MUI/`@hcw/ui-kit` marketing chrome (`MarketingNeuFrame` etc.)
 * verbatim.
 *
 * Stale-doc correction (2026-09-10): this comment used to say the old
 * `frontend/` landing page "stays live on aorms.in today" — no longer
 * true. This page became the live aorms.in landing page 2026-09-09 (see
 * ROADMAP-CLOUD.md's dated entry) — `frontend/`'s Landing.tsx is no
 * longer what the public domain actually serves.
 *
 * Signed-in visitors land on their role's home (`/dashboard` for staff,
 * `/portal` for a client — see `lib/auth/role-home.ts`); signed-out
 * visitors get this page with a "Sign in" link to the existing
 * `(auth)/login` route, not an embedded auth form.
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    redirect(roleHome(profile?.role) ?? "/login");
  }
  if (data?.claims) redirect("/dashboard");

  const latestPosts = listBlogPosts().slice(0, 3);

  return (
    <>
      <LandingHeader />
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "0 1rem" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        {/* Cover */}
        <section id="top" style={{ padding: SECTION_PAD, position: "relative", minHeight: "30rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              {/* "Live" alone gave no context (live since when, meaning
                  what) — 2026-09-10 feedback. */}
              <Tag type="green" size="sm">
                Live in production
              </Tag>
              <p
                className="cds--type-productive-heading-01"
                style={{ marginTop: "1.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {AORMS_PLATFORM.expansion}
              </p>
              <h1 className="cds--type-display-02" style={{ marginTop: "0.75rem", maxWidth: 760 }}>
                {AORMS_PLATFORM.heroHeadline}
              </h1>
              <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.heroSupport}
              </p>
              <HeroCtas />
              <p className="cds--type-caption-01" style={{ marginTop: "2rem", color: "var(--cds-text-secondary)" }}>
                One web hub · cloud-hosted · AI runs on your own data, unmetered
              </p>
            </Column>
          </Grid>
          <HeroFloatingNotices />
        </section>

        {/* Trust strip — a generic, honest set of claims already made
            elsewhere on this page (India hosting, GST/TDS, no metered AI),
            not fabricated testimonials or a made-up customer count. Added
            2026-09-10 as a placeholder for real social proof once there's
            a real customer base to feature — see marketing-content.ts's
            own header comment on TRUST_STRIP for why it's built this way. */}
        <div style={{ padding: "1.5rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 2rem", justifyContent: "center" }}>
                {TRUST_STRIP.map((line) => (
                  <p
                    key={line}
                    className="cds--type-caption-01"
                    style={{ color: "var(--cds-text-secondary)", letterSpacing: "0.02em" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </Column>
          </Grid>
        </div>

        {/* Brief */}
      <section id="brief" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              The Brief
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              What changes when the practice runs on one record
            </h2>
          </Column>
          {BRIEF.map((o) => (
            <Column key={o.n} sm={4} md={8} lg={16} style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1.5rem" }}>
                <span className="cds--type-heading-05" aria-hidden style={{ color: "var(--cds-text-placeholder)", minWidth: "3rem" }}>
                  {o.n}
                </span>
                <div>
                  <h3 className="cds--type-productive-heading-03">{o.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                    {o.body}
                  </p>
                </div>
              </div>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Specification — module schedule */}
      <section id="specification" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Specification
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              The module schedule
            </h2>
          </Column>
          {SPECIFICATION.map((f) => (
            <Column key={f.code} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-code-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {f.code}
                </p>
                <h3 className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
                  {f.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {f.body}
                </p>
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Intelligence */}
      <section id="intelligence" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Intelligence
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              {ESTI.name} on the desk.
            </h2>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <Tile style={{ height: "100%" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Internal AI agent
              </p>
              <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                {ESTI.name}
              </h3>
              <p className="cds--type-body-01" style={{ marginTop: "0.5rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                {ESTI.summary}
              </p>
            </Tile>
          </Column>
        </Grid>
      </section>

      {/* Fee proposal — licensing */}
      <section id="fee-proposal" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Fee Proposal
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Trial, Standard, Premium.
            </h2>
          </Column>
          {FEE_PROPOSAL.map((p) => (
            <Column key={p.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                  {p.eyebrow}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {p.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {p.body}
                </p>
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Blog — latest posts (moved here 2026-09-10, ahead of Identity/
          Company: those two are account/platform mechanics, better placed
          right before the final CTA than in the middle of the product
          pitch — feedback after reviewing the page as a whole). The /blog
          route already existed but was never linked from this page until
          it was first added, further down, in an earlier pass. */}
      {latestPosts.length > 0 && (
        <section id="blog" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                From the Blog
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
                Notes on running an architecture practice.
              </h2>
            </Column>
            {latestPosts.map((post) => (
              <Column key={post.slug} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
                <Tile style={{ height: "100%" }}>
                  <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {post.date}
                  </p>
                  <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.25rem" }}>
                    <Link href={`/blog/${post.slug}`} className="cds--link">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                    {post.description}
                  </p>
                </Tile>
              </Column>
            ))}
            <Column sm={4} md={8} lg={16} style={{ marginTop: "0.5rem" }}>
              <Link href="/blog" className="cds--link">
                View all posts →
              </Link>
            </Column>
          </Grid>
        </section>
      )}

      {/* Identity — two distinct identity types: a person's own account,
          and an architecture Studio's own account. Rewritten 2026-09-10 —
          previously explained only the individual side. */}
      <section id="identity" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Identity
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Two identities, one platform.
            </h2>
          </Column>
          <Column sm={4} md={4} lg={8} style={{ marginBottom: "2rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
              {INDIVIDUAL_IDENTITY.eyebrow}
            </p>
            <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
              {INDIVIDUAL_IDENTITY.title}
            </h3>
            <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              {INDIVIDUAL_IDENTITY.body}
            </p>
          </Column>
          <Column sm={4} md={4} lg={8} style={{ marginBottom: "2rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
              {STUDIO_IDENTITY.eyebrow}
            </p>
            <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
              {STUDIO_IDENTITY.title}
            </h3>
            <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              {STUDIO_IDENTITY.body}
            </p>
          </Column>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <IdentityCtas />
            <p className="cds--type-caption-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
              One signup either way — create or join your Studio from your Identity once you're signed in.
            </p>
          </Column>
          {IDENTITY.map((f) => (
            <Column key={f.title} sm={4} md={4} lg={4} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                  {f.eyebrow}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {f.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {f.body}
                </p>
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* ConnectDeX Partners — material/interior suppliers, a distinct
          entity type from Studio above, rebranded 2026-09-10 (was "For
          Suppliers"/"Company"). Landing-page branding only — see
          marketing-content.ts's CONNECTDEX header comment for why the
          underlying "Company"/AORMS-C- naming in code and the database
          is unchanged. */}
      <section id="connectdex" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              {CONNECTDEX.name}
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Building materials? List your catalogue.
            </h2>
            <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
              {CONNECTDEX.tagline}. A separate identity type from a Studio — for material and interior suppliers, not
              architecture practices. Every Studio on AORMS can discover your catalogue through the Materials directory.
            </p>
          </Column>
          {COMPANY_IDENTITY.map((f) => (
            <Column key={f.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                  {f.eyebrow}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {f.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {f.body}
                </p>
              </Tile>
            </Column>
          ))}
          <Column sm={4} md={8} lg={16} style={{ marginTop: "0.5rem" }}>
            <ConnectDexCtas />
          </Column>
        </Grid>
      </section>

      {/* CTA band */}
      <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <h2 className="cds--type-heading-05">Bring the practice onto one hub.</h2>
            <p className="cds--type-body-02" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              Architecture studios — sign in and start managing the office on one hub.
            </p>
            <BandCtas />
          </Column>
          <Column sm={4} md={8} lg={4}>
            <Tile>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                No account yet?
              </p>
              <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                Explore a live demo
              </h3>
              <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                Read-only access to a sample studio — clients, projects, tasks, and invoices, reset nightly.
              </p>
              <p className="cds--type-code-01" style={{ marginTop: "0.75rem" }}>
                {DEMO.email}
                <br />
                {DEMO.password}
              </p>
              <div style={{ marginTop: "1rem" }}>
                <Link href="/login" className="cds--link">
                  Go to sign in →
                </Link>
              </div>
            </Tile>
          </Column>
        </Grid>
      </section>

      {/* RFI (FAQ) */}
      <section id="rfi" style={{ padding: SECTION_PAD }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              RFI
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Requests for information practices ask first
            </h2>
          </Column>
          <Column sm={4} md={8} lg={12}>
            <Accordion>
              {FAQ.map((item) => (
                <AccordionItem key={item.question} title={item.question}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {item.answer}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          </Column>
        </Grid>
      </section>

      {/* Footer */}
      <footer style={{ padding: "3rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={4} lg={6}>
            {/* Plain <img>, not next/image — a static marketing asset, no optimization needed */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
            <p className="cds--type-body-01" style={{ marginTop: "0.75rem", maxWidth: 380, color: "var(--cds-text-secondary)" }}>
              {AORMS_PLATFORM.tagline}. Developed by {HUMAN_CENTRIC_WORKS.legalName}.
            </p>
          </Column>
          <Column sm={4} md={4} lg={6}>
            {/* Was labeled "Company" — renamed 2026-09-10 to avoid colliding
                with the new ConnectDeX Partners section above (#connectdex,
                material suppliers, a real, distinct entity type — this is
                just the site's own "About/links" block, unrelated). */}
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
              Site
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Site">
              <Link href="/login" className="cds--link">
                Sign in
              </Link>
              <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
                {HUMAN_CENTRIC_WORKS.email}
              </a>
            </nav>
          </Column>
          <Column sm={4} md={8} lg={4}>
            <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
            </p>
          </Column>
        </Grid>
      </footer>
      </div>
    </>
  );
}

