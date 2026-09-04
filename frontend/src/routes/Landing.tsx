/** Single-page AORMS landing — pure IBM Carbon Design System. Pomodoro clock is the one non-Carbon widget (via MarketingNeuFrame). */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Accordion, AccordionItem, Button, Column, Grid, Tag, Tile } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { LandingAuth } from "../components/landing/LandingAuth.js";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  AORMS_OFFICE_HUB,
  EOMS,
  ESTI,
  HUMAN_CENTRIC_WORKS,
} from "../lib/product-nomenclature.js";
import {
  applyArchitectureLandingSeo,
  ARCHITECTURE_LANDING_FAQ,
  injectArchitectureLandingJsonLd,
} from "../lib/architecture-landing-seo.js";
import { formatVisitCount, useLandingVisitCounter } from "../lib/landing-visit.js";

const PAGE_MAX = 1200;
const SECTION_PAD = "clamp(3rem, 6vw, 6rem) 0";

const OUTCOMES = [
  {
    n: "01",
    title: "Recover fees and manage projects precisely",
    body: "Clients, projects, proposals, invoices, and deliverables on one unified record. Track deliverables → proposals → invoices. No spreadsheet archaeology.",
  },
  {
    n: "02",
    title: "One web hub for office management",
    body: "Cloud-only office system: clients, projects, proposals, invoicing, team roster, payroll, knowledge bank, delivery tracking. All accessible from your browser.",
  },
  {
    n: "03",
    title: "Your data stays yours",
    body: "Firm data stays in your environment, and nothing is used to train third-party models. Built-in AI (ESTI) runs on your own infrastructure with access to your firm's knowledge only.",
  },
] as const;

const AUDIENCE = [
  {
    title: "Architecture studios",
    body: "Fee recovery, client portals, office management, and practice coordination — one unified web hub for your entire practice.",
  },
  {
    title: "Engineering consultancies",
    body: "Engagements, deliverables, team management, and delivery coordination — the engineering office runs on one web hub.",
  },
] as const;

const FEATURES = [
  { title: "Clients & Leads", body: "CRM with interaction log, tender tracking, portal access" },
  { title: "Projects", body: "Phases, tasks, milestones, moodboards, delivery tracking" },
  { title: "Proposals & Contracts", body: "Unified proposals with client approval gates and versioning" },
  { title: "Invoicing & Finance", body: "GST-compliant invoicing, reconciliation, cash book, reports" },
  { title: "Team & HR", body: "Roster, assignments, leaves, payroll, performance scoring" },
  { title: "Knowledge Bank", body: "Specifications, standards, compliance rules, lessons learned" },
] as const;

const STATS = [
  { label: "Office management modules", value: "10+" },
  { label: "AI agents · EOMS + ESTI", value: "Built-in" },
  { label: "Deployment model", value: "Cloud" },
] as const;

const PRICING = [
  {
    eyebrow: "Included",
    title: "Full workspace",
    body: "ACTIVE licence from signup — clients, projects, proposals, invoices, team management, knowledge bank, delivery tracking, and portals all on one unified office hub. Unlimited staff logins.",
  },
  {
    eyebrow: "Storage",
    title: "5 GB included",
    body: "Drawings and firm files. Extra storage billed per GB-month when you grow — no surprise edition upgrades.",
  },
  {
    eyebrow: "AI",
    title: "Unmetered, built in",
    body: "ESTI runs on the hub against your firm's own data — no per-token billing, no bring-your-own key needed.",
  },
] as const;

const START = [
  {
    eyebrow: "Office Hub",
    title: AORMS_OFFICE_HUB.title,
    body: "One unified web application for office management — clients, projects, proposals, invoicing, team, knowledge, and delivery.",
  },
  {
    eyebrow: "Intelligence",
    title: `${ESTI.name} · ${EOMS.name}`,
    body: `${ESTI.name} is the built-in AI agent for office automation and insights. ${EOMS.name} connects the hub to your firm's external knowledge bank.`,
  },
  {
    eyebrow: "Online",
    title: "Firm portals",
    body: "Clients and collaborators see published updates only. This apex site stays marketing and product news.",
  },
] as const;

const ON_THIS_PAGE = [
  { href: "#top", label: "Overview" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#audience", label: "Audience" },
  { href: "#features", label: "Features" },
  { href: "#start", label: "Start" },
] as const;

const FOOTER_LINKS = [
  { href: "#sign-in", label: "Sign in" },
  { href: `mailto:${HUMAN_CENTRIC_WORKS.email}`, label: HUMAN_CENTRIC_WORKS.email },
] as const;

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <Column sm={4} md={8} lg={12} style={{ marginBottom: "2rem" }}>
      <p className="cds--type-productive-heading-01" style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}>
        {eyebrow}
      </p>
      <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
        {title}
      </h2>
      {lead ? (
        <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
          {lead}
        </p>
      ) : null}
    </Column>
  );
}

/** Single-page AORMS landing — typography-led, pure Carbon. */
export function Landing() {
  const { hash } = useLocation();
  const visitCount = useLandingVisitCounter();

  useEffect(() => {
    applyArchitectureLandingSeo();
    injectArchitectureLandingJsonLd();
  }, []);

  useEffect(() => {
    // Smooth scroll to hash section (e.g. #sign-in)
    const section = hash.replace(/^#/, "");
    if (!section) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <MarketingNeuFrame hideTopBar>
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "0 1rem" }}>
        {/* Hero */}
        <section id="top" style={{ padding: SECTION_PAD }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              <AormsLogo variant="hero" />
              <p
                className="cds--type-productive-heading-01"
                style={{ marginTop: "1.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {AORMS_PLATFORM.expansion}
              </p>
              <h1 className="cds--type-display-02" style={{ marginTop: "0.75rem", maxWidth: 760 }}>
                {AORMS_PLATFORM.heroHeadline[0]}
              </h1>
              <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 540, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.heroSupport}
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", alignItems: "center" }}>
                <Button href="#sign-in" renderIcon={ArrowRight}>
                  Sign in
                </Button>
                <Button kind="tertiary" href="#features">
                  Explore features
                </Button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem", alignItems: "center" }}>
                <Tag type="green" size="sm">
                  Live
                </Tag>
                <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                  One web hub · cloud-hosted · AI runs on your own data, unmetered
                </p>
              </div>
            </Column>
          </Grid>
        </section>

        {/* Sign in */}
        <section id="sign-in" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)", borderBottom: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <LandingAuth />
            </Column>
          </Grid>
        </section>

        {/* Outcomes */}
        <section id="outcomes" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead
              eyebrow="Outcomes"
              title="What changes when the practice runs on one record"
              lead="Not another dashboard — fee recovery, delivery quality, and trusted answers stop competing with tool chaos."
            />
            {OUTCOMES.map((o) => (
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

        {/* Audience */}
        <section id="audience" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead
              eyebrow="Audience"
              title="Drawn for architects and engineers"
              lead="AEC consulting firms — not generic SaaS personas. Two practice types on one office hub."
            />
            {AUDIENCE.map((a) => (
              <Column key={a.title} sm={4} md={4} lg={8} style={{ marginBottom: "1rem" }}>
                <Tile style={{ height: "100%" }}>
                  <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {AORMS_OFFICE_HUB.title}
                  </p>
                  <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                    {a.title}
                  </h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                    {a.body}
                  </p>
                  <Button kind="ghost" size="sm" href="#sign-in" renderIcon={ArrowRight} style={{ marginTop: "1rem" }}>
                    See {AORMS_OFFICE_HUB.title}
                  </Button>
                </Tile>
              </Column>
            ))}
            <Column sm={4} md={8} lg={16} style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {AORMS_PLATFORM.aecDisciplines.map((d) => (
                  <Tag key={d} type="outline">
                    {d}
                  </Tag>
                ))}
              </div>
            </Column>
          </Grid>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead
              eyebrow="Features"
              title="Unified office management"
              lead="One web hub for Architecture, Engineering, and Construction practices — clients, projects, proposals, invoicing, team, knowledge, and delivery."
            />
            {FEATURES.map((f) => (
              <Column key={f.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
                <Tile style={{ height: "100%" }}>
                  <h3 className="cds--type-productive-heading-02">{f.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                    {f.body}
                  </p>
                </Tile>
              </Column>
            ))}
          </Grid>
        </section>

        {/* Intelligence */}
        <section style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead
              eyebrow="Intelligence"
              title={`${ESTI.name} on the desk. ${EOMS.name} in the bank.`}
              lead="AI answers only from your firm's validated repositories — never a third-party training sink."
            />
            <Column sm={4} md={4} lg={8} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Internal AI agent
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {ESTI.name}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  Built-in office automation — answers only from validated firm repositories; recommendations, insights, task automation, document generation.
                </p>
              </Tile>
            </Column>
            <Column sm={4} md={4} lg={8} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Knowledge bank (standalone API)
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {EOMS.name}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  The continuously-learning knowledge bank — a standalone API that ingests, catalogs, and serves standard codebooks and building/compliance codes on demand.
                </p>
              </Tile>
            </Column>
            {STATS.map((s) => (
              <Column key={s.label} sm={4} md={2} lg={5} style={{ marginBottom: "1rem" }}>
                <p className="cds--type-heading-05">{s.value}</p>
                <p className="cds--type-caption-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                  {s.label}
                </p>
              </Column>
            ))}
          </Grid>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead eyebrow="Pricing" title="One Standard licence." lead="No tiers. Unlimited users. Pay only for cloud storage over 5 GB — AI is unmetered." />
            {PRICING.map((p) => (
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

        {/* Start */}
        <section id="start" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead
              eyebrow="Start"
              title="Open source for now. Web-only, one hub."
              lead="Soft launch: office hub landing and blog are live. Workspace sign-in is coming soon — start with why the hub exists."
            />
            {START.map((s) => (
              <Column key={s.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {s.eyebrow}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {s.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {s.body}
                </p>
              </Column>
            ))}
          </Grid>
        </section>

        {/* CTA band */}
        <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)", borderBottom: "1px solid var(--cds-border-subtle)" }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              <h2 className="cds--type-heading-05">Bring the practice onto one hub.</h2>
              <p className="cds--type-body-02" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                Architecture studios and engineering consultancies — sign in and start managing the office on one hub.
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                <Button href="#sign-in" renderIcon={ArrowRight}>
                  Sign in
                </Button>
                <Button kind="ghost" href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}>
                  Talk to HCW
                </Button>
              </div>
            </Column>
          </Grid>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SectionHead eyebrow="Questions" title="Questions practices ask first" />
            <Column sm={4} md={8} lg={12}>
              <Accordion>
                {ARCHITECTURE_LANDING_FAQ.map((item) => (
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
              <AormsLogo variant="md" />
              <p className="cds--type-body-01" style={{ marginTop: "0.75rem", maxWidth: 380, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.tagline}. Developed by {HUMAN_CENTRIC_WORKS.legalName}.
              </p>
            </Column>
            <Column sm={4} md={2} lg={3}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                On this page
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="On this page">
                {ON_THIS_PAGE.map((s) => (
                  <a key={s.href} href={s.href} className="cds--link">
                    {s.label}
                  </a>
                ))}
              </nav>
            </Column>
            <Column sm={4} md={2} lg={3}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Company
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Company">
                {FOOTER_LINKS.map((l) => (
                  <a key={l.href} href={l.href} className="cds--link" {...(l.href.startsWith("mailto:") ? {} : {})}>
                    {l.label}
                  </a>
                ))}
              </nav>
            </Column>
            <Column sm={4} md={8} lg={4}>
              <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location} · {HUMAN_CENTRIC_WORKS.email}
              </p>
              {visitCount != null && visitCount > 0 ? (
                <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-placeholder)" }}>
                  {formatVisitCount(visitCount)} visits
                </p>
              ) : null}
            </Column>
          </Grid>
        </footer>
      </div>
    </MarketingNeuFrame>
  );
}
