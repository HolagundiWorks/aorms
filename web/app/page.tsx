import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Accordion, AccordionItem, Column, Grid, Tag, Tile } from "@carbon/react";
import { Currency, Renew, WarningAlt, UserMultiple, CheckmarkFilled, ArrowRight } from "@carbon/icons-react";
import { createClient } from "../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../lib/platform/service";
import { portalUrl } from "../lib/platform/subdomains";
import { roleHome } from "../lib/auth/role-home";
import { listBlogPosts } from "../lib/blog";
import { HeroCtas, LiveDemoCtas, FinalCtas } from "../components/aorms/LandingButtons";
import { LandingHeader } from "../components/aorms/LandingHeader";
import { BillingForecastPanel } from "../components/aorms/BillingForecastPanel";
import { RevisionLifecyclePanel } from "../components/aorms/RevisionLifecyclePanel";
import { TodaysBriefingPanel } from "../components/aorms/TodaysBriefingPanel";
import { OperationalLeakageCalculator } from "../components/aorms/landing/OperationalLeakageCalculator";
import { KpiAnatomyDiagram } from "../components/aorms/landing/KpiAnatomyDiagram";
import {
  AORMS_PLATFORM,
  CONNECTDEX,
  DEMO,
  ESTI_SECTION,
  FAQ,
  FEE_RECOVERY,
  HUMAN_CENTRIC_WORKS,
  OPERATIONAL_LEAKAGE,
  PRICING,
  PROBLEM,
  PROJECT_RECORD,
  PULSE_SECTION,
  REVISION_MANAGEMENT,
  TRUST_CARDS,
  VALUE_CARDS,
} from "../lib/marketing-content";

const PAGE_MAX = 1200;
const SECTION_PAD = "clamp(3rem, 6vw, 6rem) 0";

const VALUE_ICONS = { currency: Currency, revision: Renew, risk: WarningAlt, team: UserMultiple } as const;

/**
 * SEO (spec §35). Title/description/keywords rewritten for the
 * 2026-09-14 landing rebuild — see AORMS_PLATFORM's own header comment
 * in marketing-content.ts. Next's `title.template` in the root layout
 * ("%s — AORMS") does not cascade to this exact route segment (same
 * pre-existing quirk noted here before), so the brand suffix is appended
 * explicitly.
 */
export const metadata: Metadata = {
  title: `${AORMS_PLATFORM.expansion} — ${AORMS_PLATFORM.name}`,
  description: AORMS_PLATFORM.metaDescription,
  keywords: [
    "architecture practice management software",
    "architecture firm management software",
    "architecture project management software India",
    "architecture billing software",
    "architecture practice ERP",
    "architecture office management software",
    "architecture project tracking software",
  ],
  alternates: { canonical: "https://aorms.in/" },
  openGraph: {
    title: `${AORMS_PLATFORM.expansion} — ${AORMS_PLATFORM.name}`,
    description: AORMS_PLATFORM.metaDescription,
    url: "https://aorms.in/",
  },
};

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
 * web/'s public marketing landing page.
 *
 * 2026-09-14 full rebuild per the "AORMS Landing Page & Pricing —
 * Developer Implementation Specification": Problem → Outcome → Product →
 * Proof → ROI → Pricing → Demo, replacing the previous Identity/Studio-
 * account-framed structure. See marketing-content.ts's own header
 * comment for what the spec asked for that this deliberately does NOT
 * claim (no documented API/SSO/audit-log UI, no multi-office claim —
 * this deployment is single-tenant per Studio).
 *
 * Signed-in visitors land on their role's home (`/pulse` for staff,
 * `/portal` for a client — see `lib/auth/role-home.ts`); signed-out
 * visitors get this page.
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

  const platformService = createPlatformServiceRoleClient();
  const [{ data: planPricingRows }, latestPostsAll] = await Promise.all([
    platformService.from("plan_pricing").select("plan, base_price_paise").in("plan", ["STUDIO", "PROFESSIONAL", "ENTERPRISE"]),
    Promise.resolve(listBlogPosts()),
  ]);
  const latestPosts = latestPostsAll.slice(0, 3);

  const livePrice = (plan: string) => planPricingRows?.find((p) => p.plan === plan)?.base_price_paise ?? 0;
  const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cds-background)", color: "var(--cds-text-primary)" }}>
      <LandingHeader />
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "0 1rem" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />

        {/* 1. Hero (spec §4-5) — visual stacked full-width below the
            headline, same presentation as the dedicated Pulse section
            further down (id="pulse") rather than squeezed into a narrow
            side column, per explicit follow-up request ("replace the
            hero visual with the pulse dashboard visual, copy the same
            from pulse section"). Both sections render the exact same
            TodaysBriefingPanel component/data — this only changes the
            hero's own column layout to match how that panel is shown
            there (full Grid width, one clean horizontal row). */}
        <section id="top" style={{ padding: "clamp(2.5rem, 5vw, 4rem) 0" }}>
          <Grid>
            <Column sm={4} md={8} lg={11}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {AORMS_PLATFORM.expansion.toUpperCase()}
              </p>
              <h1 className="cds--type-heading-06" style={{ marginTop: "0.75rem", maxWidth: 620, whiteSpace: "pre-line" }}>
                {AORMS_PLATFORM.heroHeadline}
              </h1>
              <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.heroSupport}
              </p>
              <HeroCtas />
              <p className="cds--type-caption-01" style={{ marginTop: "1rem", color: "var(--cds-text-secondary)" }}>
                No installation · Browser-based · Built for architecture practices
              </p>
            </Column>
            <Column sm={4} md={8} lg={16} style={{ marginTop: "2.5rem" }}>
              <TodaysBriefingPanel />
            </Column>
          </Grid>
        </section>

        {/* 2. Problem (spec §6) — two rows (text, then chain/resolution),
            not side-by-side columns, per explicit follow-up request. */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={10}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {PROBLEM.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", whiteSpace: "pre-line" }}>
                {PROBLEM.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                {PROBLEM.body}
              </p>
            </Column>
            {/* Chain and the resolution Tile share one row (explicit
                follow-up request — the Tile was sitting in its own row
                below instead of beside the chain). md=4/md=4 splits
                evenly starting at Carbon's md breakpoint, same earlier-
                breakpoint fix already applied to Fee Recovery. */}
            <Column sm={4} md={4} lg={10} style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                {PROBLEM.chain.map((step, i) => (
                  <span key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Tag type="cool-gray" size="md">
                      {step}
                    </Tag>
                    {i < PROBLEM.chain.length - 1 && <ArrowRight size={14} style={{ color: "var(--cds-icon-secondary)" }} />}
                  </span>
                ))}
              </div>
            </Column>
            <Column sm={4} md={4} lg={{ span: 5, offset: 11 }} style={{ marginTop: "2rem" }}>
              <Tile>
                <p className="cds--type-productive-heading-02">{PROBLEM.resolution.title}</p>
                {PROBLEM.resolution.lines.map((line) => (
                  <p key={line} className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                    {line}
                  </p>
                ))}
              </Tile>
            </Column>
          </Grid>
        </section>

        {/* 3. Core value proposition — four cards (spec §7) */}
        <section id="value" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <h2 className="cds--type-heading-05">See what needs attention before it becomes expensive.</h2>
            </Column>
            {VALUE_CARDS.map((card) => {
              const Icon = VALUE_ICONS[card.icon];
              return (
                <Column key={card.title} sm={4} md={4} lg={4} style={{ marginBottom: "1rem" }}>
                  <Tile style={{ height: "100%" }}>
                    <Icon size={24} style={{ color: "var(--cds-support-info)" }} />
                    <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.75rem" }}>
                      {card.title}
                    </h3>
                    <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                      {card.body}
                    </p>
                  </Tile>
                </Column>
              );
            })}
          </Grid>
        </section>

        {/* 4. Pulse showcase (spec §8) */}
        <section id="pulse" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {PULSE_SECTION.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {PULSE_SECTION.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                {PULSE_SECTION.body}
              </p>
            </Column>
            <Column sm={4} md={8} lg={16}>
              <TodaysBriefingPanel />
            </Column>

            {/* KPI-tile anatomy diagram (explicit follow-up request) —
                explains each visual part of a KPI tile with leader
                lines, and what it maps to in Carbon's own primitives/
                type tokens (Carbon has no official "KPI card" component;
                this is a composition of Tile + type tokens + semantic
                color, same as the real product's own KpiTile.tsx). */}
            <Column sm={4} md={8} lg={16} style={{ marginTop: "3rem" }}>
              <h3 className="cds--type-productive-heading-03">How to read a Pulse KPI tile.</h3>
              <p className="cds--type-body-01" style={{ marginTop: "0.5rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                Every tile above — and every KPI tile across AORMS, not just Pulse — follows this same anatomy, built entirely
                from stock Carbon Design System primitives rather than a bespoke card design.
              </p>
              <div style={{ marginTop: "1.5rem", maxWidth: 800 }}>
                <KpiAnatomyDiagram />
              </div>
            </Column>
          </Grid>
        </section>

        {/* 5. Fee Recovery (spec §9) — two columns (text+chain, then the
            panel), not stacked rows, per explicit follow-up request. */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={4} lg={7}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {FEE_RECOVERY.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
                {FEE_RECOVERY.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                {FEE_RECOVERY.body}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
                {FEE_RECOVERY.chain.map((step, i) => (
                  <span key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Tag type="blue" size="sm">
                      {step}
                    </Tag>
                    {i < FEE_RECOVERY.chain.length - 1 && <ArrowRight size={14} style={{ color: "var(--cds-icon-secondary)" }} />}
                  </span>
                ))}
              </div>
            </Column>
            <Column sm={4} md={4} lg={{ span: 8, offset: 8 }}>
              <BillingForecastPanel />
            </Column>
          </Grid>
        </section>

        {/* 6. Revision Management (spec §10) */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {REVISION_MANAGEMENT.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", maxWidth: 640 }}>
                {REVISION_MANAGEMENT.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                {REVISION_MANAGEMENT.body}
              </p>
            </Column>
            <Column sm={4} md={8} lg={16}>
              <RevisionLifecyclePanel />
            </Column>
          </Grid>
        </section>

        {/* 7. Project Operating Record (spec §11) */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={7}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {PROJECT_RECORD.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
                {PROJECT_RECORD.title}
              </h2>
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }} style={{ marginTop: "1.5rem" }}>
              <Tile>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {PROJECT_RECORD.fields.map((field) => (
                    <Tag key={field} type="cool-gray" size="md">
                      {field}
                    </Tag>
                  ))}
                </div>
              </Tile>
            </Column>
          </Grid>
        </section>

        {/* 8. ESTI (spec §12) */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={7}>
              <p
                className="cds--type-productive-heading-01"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {ESTI_SECTION.eyebrow}
              </p>
              <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem", whiteSpace: "pre-line" }}>
                {ESTI_SECTION.title}
              </h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                {ESTI_SECTION.body}
              </p>
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }} style={{ marginTop: "1.5rem" }}>
              {ESTI_SECTION.exampleQuestions.map((q) => (
                <Tile key={q} style={{ marginBottom: "0.75rem" }}>
                  <p className="cds--type-body-01">&ldquo;{q}&rdquo;</p>
                </Tile>
              ))}
            </Column>
          </Grid>
        </section>

        {/* 9. Operational leakage / cost calculator (spec §13) — the
            standalone ROI Calculator (annual fees / mgmt+admin hours /
            potential-annual-value form) was removed 2026-09-14 once
            OperationalLeakageCalculator covered the same "what does
            leakage cost" ground directly from real cause hours. */}
        <section id="roi" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <h2 className="cds--type-heading-05">What is operational leakage costing your practice?</h2>
            </Column>

            {/* Explains what operational leakage is and how it shows up
                specifically in an Indian practice, ahead of the
                calculator (explicit follow-up request). */}
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2.5rem" }}>
              <h3 className="cds--type-productive-heading-03">{OPERATIONAL_LEAKAGE.title}</h3>
              <p className="cds--type-body-02" style={{ marginTop: "0.5rem", maxWidth: 720, color: "var(--cds-text-secondary)" }}>
                {OPERATIONAL_LEAKAGE.body}
              </p>
              <div style={{ marginTop: "1.5rem" }}>
                <OperationalLeakageCalculator />
              </div>
              <p className="cds--type-body-02" style={{ marginTop: "1.5rem", maxWidth: 720, color: "var(--cds-text-secondary)" }}>
                {OPERATIONAL_LEAKAGE.closing}
              </p>
            </Column>
          </Grid>
        </section>

        {/* 11. Trust (spec §15) */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "1.5rem" }}>
              <h2 className="cds--type-heading-05">Your practice data stays yours.</h2>
            </Column>
            {TRUST_CARDS.map((card) => (
              <Column key={card.title} sm={4} md={4} lg={4} style={{ marginBottom: "1rem" }}>
                <Tile style={{ height: "100%" }}>
                  <p className="cds--type-productive-heading-02">{card.title}</p>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                    {card.body}
                  </p>
                </Tile>
              </Column>
            ))}
          </Grid>
        </section>

        {/* 12. Pricing (spec §16-20, §25) — reads live prices from
            plan_pricing so this section never drifts from what /licences
            actually charges. */}
        <section id="pricing" data-analytics-event="pricing_view" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
              <h2 className="cds--type-heading-05">One practice. One subscription. No per-seat tax.</h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.5rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                AORMS is priced around the practice, not around every person who needs access.
              </p>
            </Column>

            {(
              [
                { key: "FREE", plan: PRICING.free, price: "₹0", suffix: null, sub: null },
                {
                  key: "STUDIO",
                  plan: PRICING.studio,
                  price: formatRupees(livePrice("STUDIO") / 12),
                  suffix: "/month",
                  sub: `${formatRupees(livePrice("STUDIO"))}/year, billed annually`,
                },
                {
                  key: "PROFESSIONAL",
                  plan: PRICING.professional,
                  price: formatRupees(livePrice("PROFESSIONAL") / 12),
                  suffix: "/month",
                  sub: `${formatRupees(livePrice("PROFESSIONAL"))}/year, billed annually`,
                },
                { key: "ENTERPRISE", plan: PRICING.enterprise, price: `From ${formatRupees(livePrice("ENTERPRISE"))}`, suffix: "/year", sub: "Custom pricing" },
              ] as const
            ).map(({ key, plan, price, suffix, sub }) => (
              <Column key={key} sm={4} md={4} lg={4} style={{ marginBottom: "1rem" }}>
                <Tile style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 className="cds--type-productive-heading-03">{plan.name}</h3>
                    {"badge" in plan && plan.badge && (
                      <Tag type="green" size="sm">
                        {plan.badge}
                      </Tag>
                    )}
                  </div>
                  <p className="cds--type-caption-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                    {plan.tagline}
                  </p>
                  <p className="cds--type-heading-04" style={{ marginTop: "0.75rem" }}>
                    {price}
                    {suffix && <span className="cds--type-body-01">{suffix}</span>}
                  </p>
                  {sub && (
                    <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {sub}
                    </p>
                  )}
                  <div style={{ marginTop: "1rem", flex: 1 }}>
                    {plan.includes.map((line) => (
                      <div key={line} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <CheckmarkFilled size={16} style={{ color: "var(--cds-support-success)", flexShrink: 0, marginTop: "0.125rem" }} />
                        <span className="cds--type-body-01">{line}</span>
                      </div>
                    ))}
                  </div>
                </Tile>
              </Column>
            ))}

            <Column sm={4} md={8} lg={16} style={{ marginTop: "1rem" }}>
              <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                AI included on every paid plan — no per-token billing. Create or join your Studio from your AORMS Identity once you&apos;re
                signed in.
              </p>
            </Column>
          </Grid>
        </section>

        {/* Blog teaser */}
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

        {/* 13. Live Demo (spec §26) */}
        <section id="live-demo" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={9}>
              <h2 className="cds--type-heading-05">Don&apos;t take our word for it. Open the practice.</h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
                Explore a working AORMS practice and see how projects, fees, revisions, people, and Pulse work together.
              </p>
              <LiveDemoCtas />
            </Column>
            <Column sm={4} md={8} lg={{ span: 6, offset: 1 }} style={{ marginTop: "1.5rem" }}>
              <Tile>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                  Demo credentials
                </p>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  Read-only access to a sample studio — clients, projects, tasks, invoices, billing forecasts, and revisions, reset nightly.
                </p>
                <p className="cds--type-code-01" style={{ marginTop: "0.75rem" }}>
                  {DEMO.email}
                  <br />
                  {DEMO.password}
                </p>
              </Tile>
            </Column>
          </Grid>
        </section>

        {/* RFI (FAQ) */}
        <section id="rfi" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
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

        {/* 14. Final CTA (spec §27) */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)", borderBottom: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              <h2 className="cds--type-heading-05">Run your practice from one operating record.</h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                Projects. Fees. Revisions. People. One practice. One system.
              </p>
              <FinalCtas />
            </Column>
          </Grid>
        </section>

        {/* ConnectDeX Partners — kept small, per spec's non-negotiable
            list (ConnectDeX out of the primary AORMS story). */}
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

        {/* 15. Footer (spec §28) — 5 columns: Product/Solutions/
            Resources/Company/Account. */}
        <footer style={{ padding: "3rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={4} style={{ marginBottom: "1.5rem" }}>
              {/* Plain <img>, not next/image — a static marketing asset, no optimization needed */}
              <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
              <p className="cds--type-body-01" style={{ marginTop: "0.75rem", maxWidth: 300, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.tagline} Developed by {HUMAN_CENTRIC_WORKS.legalName}.
              </p>
            </Column>
            <Column sm={2} md={2} lg={2} style={{ marginBottom: "1.5rem" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Product
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Product">
                <Link href="#pulse" className="cds--link">
                  Pulse
                </Link>
                <Link href="#value" className="cds--link">
                  Projects
                </Link>
                <Link href="#pricing" className="cds--link">
                  Fees &amp; Billing
                </Link>
                <Link href="#value" className="cds--link">
                  Revisions
                </Link>
                <Link href="#" className="cds--link">
                  ESTI
                </Link>
              </nav>
            </Column>
            <Column sm={2} md={2} lg={2} style={{ marginBottom: "1.5rem" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Solutions
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Solutions">
                <Link href="#pricing" className="cds--link">
                  Small Practices
                </Link>
                <Link href="#pricing" className="cds--link">
                  Growing Practices
                </Link>
                <Link href="#pricing" className="cds--link">
                  Enterprise Practices
                </Link>
              </nav>
            </Column>
            <Column sm={2} md={2} lg={2} style={{ marginBottom: "1.5rem" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Resources
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Resources">
                <Link href="/blog" className="cds--link">
                  Blog
                </Link>
                <Link href="#roi" className="cds--link">
                  ROI Calculator
                </Link>
              </nav>
            </Column>
            <Column sm={2} md={2} lg={2} style={{ marginBottom: "1.5rem" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Company
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Company">
                <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
                  Contact
                </a>
                <Link href="/connectdex-partners" className="cds--link">
                  Partners
                </Link>
                <Link href="/privacy" className="cds--link">
                  Privacy Policy
                </Link>
                <Link href="/legal" className="cds--link">
                  Terms of Service
                </Link>
              </nav>
            </Column>
            <Column sm={2} md={2} lg={2} style={{ marginBottom: "1.5rem" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Account
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Account">
                <Link href="/login" className="cds--link">
                  Sign In
                </Link>
                <Link href={portalUrl("identity", "/platform-signup")} className="cds--link">
                  Create Practice
                </Link>
              </nav>
            </Column>
            <Column sm={4} md={8} lg={16} style={{ marginTop: "0.5rem" }}>
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
