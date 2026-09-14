import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Accordion, AccordionItem, Column, Grid, Tile } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { createClient } from "../lib/supabase/server";
import { roleHome } from "../lib/auth/role-home";
import { listBlogPosts } from "../lib/blog";
import { BandCtas } from "../components/aorms/LandingButtons";
import { LandingHeader } from "../components/aorms/LandingHeader";
import { BillingForecastPanel } from "../components/aorms/BillingForecastPanel";
import { RevisionLifecyclePanel } from "../components/aorms/RevisionLifecyclePanel";
import { TaskPriorityPanel } from "../components/aorms/TaskPriorityPanel";
import { TodaysBriefingPanel } from "../components/aorms/TodaysBriefingPanel";
import {
  AORMS_PLATFORM,
  BILLING_FORECAST,
  CONNECTDEX,
  DEMO,
  FAQ,
  HUMAN_CENTRIC_WORKS,
  INDIVIDUAL_IDENTITY,
  PRICING,
  REVISION_LIFECYCLE,
  TASK_PRIORITIZATION,
  TODAYS_BRIEFING,
  STUDIO_IDENTITY,
  TRUST_STRIP,
} from "../lib/marketing-content";

const PAGE_MAX = 1200;
const SECTION_PAD = "clamp(3rem, 6vw, 6rem) 0";

/**
 * 2026-09-14 SEO audit fixes:
 * - Title now includes the brand suffix explicitly. Next's `title.template`
 *   in the root layout ("%s — AORMS") does NOT apply here — template
 *   substitution only cascades to descendant route segments, and this
 *   page.tsx sits at the exact same segment as the layout that defines
 *   the template, so its own title string was rendering bare (confirmed
 *   via curl against the dev server: every other top-level page picked
 *   up "— AORMS", this one didn't).
 * - `description` now uses the dedicated, SERP-length `metaDescription`
 *   (140 chars) instead of `heroSupport` (243 chars, well past Google's
 *   ~155-160 char practical truncation point) — see AORMS_PLATFORM's own
 *   header comment on that field. `heroSupport` stays what's shown
 *   on-page and in the JSON-LD below; only the crawlable <meta
 *   name="description"> and og:description change here.
 */
export const metadata: Metadata = {
  title: `${AORMS_PLATFORM.heroHeadline} — ${AORMS_PLATFORM.name}`,
  description: AORMS_PLATFORM.metaDescription,
  alternates: { canonical: "https://aorms.in/" },
  openGraph: {
    title: `${AORMS_PLATFORM.heroHeadline} — ${AORMS_PLATFORM.name}`,
    description: AORMS_PLATFORM.metaDescription,
    url: "https://aorms.in/",
  },
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
 * Signed-in visitors land on their role's home (`/pulse` for staff,
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

  const latestPosts = listBlogPosts().slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cds-background)", color: "var(--cds-text-primary)" }}>
      <LandingHeader />
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "0 1rem" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        {/* Cover */}
        <section id="top" style={{ padding: "clamp(2.5rem, 5vw, 4rem) 0" }}>
          <Grid>
            <Column sm={4} md={8} lg={11}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {AORMS_PLATFORM.expansion}
              </p>
              <h1 className="cds--type-heading-06" style={{ marginTop: "0.75rem", maxWidth: 620 }}>
                {AORMS_PLATFORM.heroHeadline}
              </h1>
              <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.heroSupport}
              </p>
              {/* No CTA button here (2026-09-14, explicit direction: "move
                  all the login, signup and other CTA to this section" —
                  the CTA band headlined "Bring the practice onto one
                  hub."). Just a plain scroll link, not a Button, so the
                  hero doesn't read as a second competing call to action. */}
              <Link href="#billing-forecast" className="cds--link" style={{ display: "inline-block", marginTop: "2rem" }}>
                See what&apos;s inside ↓
              </Link>
              <p className="cds--type-caption-01" style={{ marginTop: "1rem", color: "var(--cds-text-secondary)" }}>
                One web hub · cloud-hosted · AI runs on your own data, unmetered
              </p>
            </Column>
            <Column sm={4} md={8} lg={{ span: 5, offset: 11 }} style={{ marginTop: "2rem" }}>
              {/* Pulse's Today's Briefing panel, reused as the hero
                  visual (2026-09-14, explicit direction: "replace the
                  visuals of hero section same as pulse visuals") — was
                  HeroRecordChain (the Client→Project→Proposal→Invoice
                  chain, removed entirely, no longer used anywhere). */}
              <TodaysBriefingPanel />
            </Column>
          </Grid>
        </section>

        {/* Billing Forecast — dedicated feature section, hero-adjacent
            (2026-09-14, explicit direction). See BILLING_FORECAST's own
            header comment in marketing-content.ts. */}
        <section id="billing-forecast" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {BILLING_FORECAST.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {BILLING_FORECAST.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {BILLING_FORECAST.body}
              </p>
            </Column>
            <Column sm={4} md={4} lg={7} style={{ marginBottom: "1.5rem" }}>
              {BILLING_FORECAST.points.map((p) => (
                <div key={p.title} style={{ marginBottom: "1.5rem" }}>
                  <h3 className="cds--type-productive-heading-03">{p.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.375rem", color: "var(--cds-text-secondary)" }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }}>
              <BillingForecastPanel />
            </Column>
          </Grid>
        </section>

        {/* Revision Lifecycle — second dedicated feature section
            (2026-09-14, explicit direction). See REVISION_LIFECYCLE's own
            header comment in marketing-content.ts. */}
        <section id="revision-lifecycle" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {REVISION_LIFECYCLE.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {REVISION_LIFECYCLE.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                {REVISION_LIFECYCLE.body}
              </p>
            </Column>
            <Column sm={4} md={8} lg={16}>
              <RevisionLifecyclePanel />
            </Column>
          </Grid>
        </section>

        {/* Task Prioritization — third dedicated feature section
            (2026-09-14, explicit direction). See TASK_PRIORITIZATION's
            own header comment in marketing-content.ts. */}
        <section id="task-prioritization" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {TASK_PRIORITIZATION.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {TASK_PRIORITIZATION.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {TASK_PRIORITIZATION.body}
              </p>
            </Column>
            <Column sm={4} md={4} lg={7} style={{ marginBottom: "1.5rem" }}>
              {TASK_PRIORITIZATION.points.map((p) => (
                <div key={p.title} style={{ marginBottom: "1.5rem" }}>
                  <h3 className="cds--type-productive-heading-03">{p.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.375rem", color: "var(--cds-text-secondary)" }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }}>
              <TaskPriorityPanel />
            </Column>
          </Grid>
        </section>

        {/* Today's Briefing — fourth dedicated feature section
            (2026-09-14, explicit direction: "pulse today briefing"). See
            TODAYS_BRIEFING's own header comment in marketing-content.ts. */}
        <section id="todays-briefing" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {TODAYS_BRIEFING.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {TODAYS_BRIEFING.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {TODAYS_BRIEFING.body}
              </p>
            </Column>
            <Column sm={4} md={4} lg={7} style={{ marginBottom: "1.5rem" }}>
              {TODAYS_BRIEFING.points.map((p) => (
                <div key={p.title} style={{ marginBottom: "1.5rem" }}>
                  <h3 className="cds--type-productive-heading-03">{p.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.375rem", color: "var(--cds-text-secondary)" }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }}>
              <TodaysBriefingPanel />
            </Column>
          </Grid>
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

      {/* Brief, Specification, and Fee Proposal sections removed
          (2026-09-14, explicit direction) — the account-package
          breakdown below (Pricing) now carries the plan story on its
          own; BRIEF/SPECIFICATION/FEE_PROPOSAL removed from
          marketing-content.ts as dead code along with these sections. */}

      {/* Pricing — two-sided account packages (2026-09-14 rewrite,
          explicit direction): an Individual account is Basic (identity
          only, no feature access) or Pro (subscription required to use
          the hub's features); a Studio account is Basic, Pro, or
          Enterprise (staff of 25+). See PRICING's own header comment in
          marketing-content.ts — this is a landing-page copy
          simplification, not a change to the Platform's own
          plan_pricing rows. */}
      <section id="pricing" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Identity &amp; Pricing
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Two separate accounts. Basic exists, Pro runs the practice.
            </h2>
            <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
              No trial on either side. Basic is just an identity — Pro is the subscription that unlocks the hub&apos;s features.
            </p>
          </Column>

          {/* Your Identity — the person, never billed directly */}
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "1rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
              {INDIVIDUAL_IDENTITY.eyebrow}
            </p>
            <p className="cds--type-body-01" style={{ marginTop: "0.375rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
              {INDIVIDUAL_IDENTITY.body}
            </p>
          </Column>
          {PRICING.individual.map((p) => (
            <Column key={p.name} sm={4} md={4} lg={8} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 className="cds--type-productive-heading-03">{p.name}</h3>
                  {p.verified && <CheckmarkFilled size={18} style={{ color: "var(--cds-support-info)" }} aria-label="Verified" />}
                </div>
                <p className="cds--type-heading-04" style={{ marginTop: "0.75rem", color: "var(--cds-support-info)" }}>
                  {p.price}
                </p>
                <p className="cds--type-body-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                  {p.detail}
                </p>
              </Tile>
            </Column>
          ))}

          {/* Your Studio — a completely separate account from the above */}
          <Column sm={4} md={8} lg={16} style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
              {STUDIO_IDENTITY.eyebrow}
            </p>
            <p className="cds--type-body-01" style={{ marginTop: "0.375rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
              {STUDIO_IDENTITY.body}
            </p>
          </Column>
          {PRICING.studio.map((p) => (
            <Column key={p.name} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 className="cds--type-productive-heading-03">{p.name}</h3>
                  {p.verified && <CheckmarkFilled size={18} style={{ color: "var(--cds-support-info)" }} aria-label="Verified" />}
                </div>
                <p className="cds--type-heading-04" style={{ marginTop: "0.75rem", color: "var(--cds-support-info)" }}>
                  {p.price}
                </p>
                <p className="cds--type-body-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                  {p.detail}
                </p>
              </Tile>
            </Column>
          ))}

          <Column sm={4} md={8} lg={16} style={{ marginTop: "1rem" }}>
            {/* Buttons moved to the CTA band below (2026-09-14, explicit
                direction) — just the explanatory line stays here. */}
            <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              One signup either way — create or join your Studio from your Identity once you&apos;re signed in.
            </p>
          </Column>
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

      {/* Identity section merged into Pricing above (2026-09-14, explicit
          direction: "simplify the identities section, and merge
          identities with pricing section") — INDIVIDUAL_IDENTITY/
          STUDIO_IDENTITY now render as the two blurbs inside #pricing's
          own "Your Identity"/"Your Studio" groups, IdentityCtas moved
          there too. The old 3-card IDENTITY array is removed as dead
          code (its detail is now covered by PRICING's own tiles). */}

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
                Read-only access to a sample studio — clients, projects, tasks, invoices, billing forecasts, revisions, task
                priority, and Pulse&apos;s daily brief, reset nightly.
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

      {/* ConnectDeX Partners — kept small on this page (2026-09-14,
          explicit direction: "keep it small, move all the connectdex
          info into a separate page"). Full content (tiles, CTAs) lives
          at /connectdex-partners now; this is a one-line teaser linking
          there. Still the last content section on the page, right before
          the footer, and still unlinked from the header nav. */}
      <section id="connectdex" style={{ padding: "1.5rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.5rem 1rem" }}>
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              Also on AORMS: <strong style={{ color: "var(--cds-text-primary)" }}>{CONNECTDEX.name}</strong> — {CONNECTDEX.tagline}.
            </p>
            <Link href="/connectdex-partners" className="cds--link">
              Learn more →
            </Link>
          </Column>
        </Grid>
      </section>

      {/* Footer — completed 2026-09-14 (explicit direction: "complete the
          footer section") with the Legal and ConnectDeX Partners columns
          that were missing before (both pages new/moved this same date:
          /privacy, /legal, /connectdex-partners). */}
      <footer style={{ padding: "3rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={5} style={{ marginBottom: "1.5rem" }}>
            {/* Plain <img>, not next/image — a static marketing asset, no optimization needed */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
            <p className="cds--type-body-01" style={{ marginTop: "0.75rem", maxWidth: 340, color: "var(--cds-text-secondary)" }}>
              {AORMS_PLATFORM.tagline}. Developed by {HUMAN_CENTRIC_WORKS.legalName}.
            </p>
          </Column>
          <Column sm={2} md={2} lg={3} style={{ marginBottom: "1.5rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
              Site
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Site">
              <Link href="/#pricing" className="cds--link">
                Architect
              </Link>
              <Link href="/blog" className="cds--link">
                Blog
              </Link>
              <Link href="/login" className="cds--link">
                Sign in
              </Link>
            </nav>
          </Column>
          <Column sm={2} md={2} lg={3} style={{ marginBottom: "1.5rem" }}>
            {/* Was labeled "Company" — renamed 2026-09-10 to avoid colliding
                with the ConnectDeX Partners entity type above; that
                content now has its own column here instead. */}
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
              {CONNECTDEX.name}
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="ConnectDeX Partners">
              <Link href="/connectdex-partners" className="cds--link">
                For suppliers
              </Link>
              <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
                {HUMAN_CENTRIC_WORKS.email}
              </a>
            </nav>
          </Column>
          <Column sm={2} md={2} lg={3} style={{ marginBottom: "1.5rem" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
              Legal
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Legal">
              <Link href="/privacy" className="cds--link">
                Privacy Policy
              </Link>
              <Link href="/legal" className="cds--link">
                Terms of Service
              </Link>
            </nav>
          </Column>
          <Column sm={4} md={8} lg={2} style={{ marginBottom: "1.5rem" }}>
            <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
            </p>
          </Column>
        </Grid>
      </footer>
      </div>
    </div>
  );
}

