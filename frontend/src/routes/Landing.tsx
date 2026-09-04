/**
 * AORMS landing — pure IBM Carbon Design System, structured as a drawing set
 * rather than a generic SaaS page: a cover sheet, a brief, a plan, a
 * specification schedule, a fee proposal, and a handover — the documents an
 * architect already reads for a living. Pomodoro clock is the one
 * non-Carbon widget (via MarketingNeuFrame).
 */
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

/** A-01 · The Brief — the problem, stated the way a design brief states it. */
const BRIEF = [
  {
    n: "01",
    title: "One record, not a folder per app",
    body: "Clients, projects, proposals, and invoices linked on one record — a fee proposal references its project, an invoice references its proposal and phase. Nothing re-typed, nothing drifts out of sync.",
  },
  {
    n: "02",
    title: "Written for how a practice actually bills",
    body: "COA fee scales, phase-wise billing against work stages, GST/TDS on professional fees, client approval gates before a rupee is invoiced — the domain logic is architecture, not adapted from a generic project template.",
  },
  {
    n: "03",
    title: "Your drawings, your data, your infrastructure",
    body: "Firm data stays in your environment; nothing trains a third-party model. The built-in AI (ESTI) answers only from your own firm's records — never a public model guessing at your practice.",
  },
] as const;

/** A-03 · Specification — the module schedule, drawn like a finishes schedule. */
const SPECIFICATION = [
  { code: "M-01", title: "Clients & Leads", body: "CRM with interaction log, tender tracking, portal access" },
  { code: "M-02", title: "Projects", body: "Phases, tasks, milestones, moodboards, delivery tracking" },
  { code: "M-03", title: "Proposals & Contracts", body: "Unified proposals with client approval gates and versioning" },
  { code: "M-04", title: "Invoicing & Finance", body: "GST-compliant invoicing, reconciliation, cash book, reports" },
  { code: "M-05", title: "Team & HR", body: "Roster, assignments, leaves, payroll, performance scoring" },
  { code: "M-06", title: "Knowledge Bank", body: "Specifications, standards, compliance rules, lessons learned" },
] as const;

const STATS = [
  { label: "Office management modules", value: "10+" },
  { label: "AI agent · ESTI", value: "Built-in" },
  { label: "Deployment model", value: "Cloud" },
] as const;

/** A-05 · Fee Proposal — pricing, in an architect's own document format. */
const FEE_PROPOSAL = [
  {
    eyebrow: "Scope",
    title: "Full workspace",
    body: "ACTIVE licence from signup — clients, projects, proposals, invoices, team management, knowledge bank, delivery tracking, and portals all on one unified office hub. Unlimited staff logins.",
  },
  {
    eyebrow: "Basis of fee",
    title: "5 GB included",
    body: "Drawings and firm files. Extra storage billed per GB-month when you grow — no surprise edition upgrades, no per-seat pricing.",
  },
  {
    eyebrow: "Exclusions",
    title: "No metered AI",
    body: "ESTI runs on the hub against your firm's own data — no per-token billing, no bring-your-own key needed. There is nothing else to buy.",
  },
] as const;

/** A-06 · Handover — onboarding, in construction handover vocabulary. */
const HANDOVER = [
  {
    eyebrow: "Practical completion",
    title: AORMS_OFFICE_HUB.title,
    body: "One unified web application for office management — clients, projects, proposals, invoicing, team, knowledge, and delivery.",
  },
  {
    eyebrow: "Defects liability",
    title: ESTI.name,
    body: `${ESTI.name} is the built-in AI agent for office automation and insights, answering only from your firm's own validated repositories.`,
  },
  {
    eyebrow: "As-built record",
    title: "Firm portals",
    body: "Clients and collaborators see published updates only. This apex site stays marketing and product news.",
  },
] as const;

const SHEET_INDEX = [
  { href: "#top", label: "A-00 Cover" },
  { href: "#brief", label: "A-01 Brief" },
  { href: "#plan", label: "A-02 Plan" },
  { href: "#specification", label: "A-03 Specification" },
  { href: "#handover", label: "A-06 Handover" },
] as const;

const FOOTER_LINKS = [
  { href: "#sign-in", label: "Sign in" },
  { href: `mailto:${HUMAN_CENTRIC_WORKS.email}`, label: HUMAN_CENTRIC_WORKS.email },
] as const;

function SheetHead({
  sheet,
  eyebrow,
  title,
  lead,
}: {
  sheet?: string;
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <Column sm={4} md={8} lg={12} style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
        {sheet ? (
          <span
            className="cds--type-code-01"
            aria-hidden
            style={{
              border: "1px solid var(--cds-border-strong)",
              padding: "0.0625rem 0.375rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            {sheet}
          </span>
        ) : null}
        <p
          className="cds--type-productive-heading-01"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
        >
          {eyebrow}
        </p>
      </div>
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

/** Single-page AORMS landing — a drawing set, not a scroll of SaaS blocks. */
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
        {/* A-00 · Cover sheet */}
        <section id="top" style={{ padding: SECTION_PAD }}>
          <Grid>
            <Column sm={4} md={8} lg={12}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  className="cds--type-code-01"
                  aria-hidden
                  style={{ border: "1px solid var(--cds-border-strong)", padding: "0.0625rem 0.375rem", color: "var(--cds-text-secondary)" }}
                >
                  A-00 · COVER
                </span>
                <Tag type="green" size="sm">
                  Live
                </Tag>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <AormsLogo variant="hero" />
              </div>
              <p
                className="cds--type-productive-heading-01"
                style={{ marginTop: "1.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
              >
                {AORMS_PLATFORM.expansion}
              </p>
              <h1 className="cds--type-display-02" style={{ marginTop: "0.75rem", maxWidth: 760 }}>
                {AORMS_PLATFORM.heroHeadline[0]}
              </h1>
              <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
                {AORMS_PLATFORM.heroSupport}
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", alignItems: "center" }}>
                <Button href="#sign-in" renderIcon={ArrowRight}>
                  Sign in
                </Button>
                <Button kind="tertiary" href="#specification">
                  Read the specification
                </Button>
              </div>
              <p className="cds--type-caption-01" style={{ marginTop: "2rem", color: "var(--cds-text-secondary)" }}>
                One web hub · cloud-hosted · AI runs on your own data, unmetered
              </p>
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

        {/* A-01 · The Brief */}
        <section id="brief" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-01"
              eyebrow="The Brief"
              title="What changes when the practice runs on one record"
              lead="Not another dashboard — fee recovery, delivery quality, and trusted answers stop competing with tool chaos."
            />
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

        {/* A-02 · The Plan */}
        <section id="plan" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-02"
              eyebrow="The Plan"
              title="Drawn for architecture practices — not a generic persona"
              lead="An architectural consultancy's office hub. COA scale of charges, GST/TDS on professional fees, and phase-wise billing are native, not bolted on."
            />
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {AORMS_OFFICE_HUB.title}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  Architecture studios
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  Fee recovery, client portals, office management, and practice coordination — one unified web hub for your entire practice.
                </p>
                <Button kind="ghost" size="sm" href="#sign-in" renderIcon={ArrowRight} style={{ marginTop: "1rem" }}>
                  See {AORMS_OFFICE_HUB.title}
                </Button>
              </Tile>
            </Column>
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

        {/* A-03 · Specification — module schedule */}
        <section id="specification" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-03"
              eyebrow="Specification"
              title="The module schedule"
              lead="One web hub for architecture practices — clients, projects, proposals, invoicing, team, knowledge, and delivery."
            />
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

        {/* A-04 · Intelligence */}
        <section id="intelligence" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-04"
              eyebrow="Intelligence"
              title={`${ESTI.name} on the desk.`}
              lead="AI answers only from your firm's validated repositories — never a third-party training sink."
            />
            <Column sm={4} md={8} lg={16} style={{ marginBottom: "1rem" }}>
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

        {/* A-05 · Fee Proposal */}
        <section id="fee-proposal" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-05"
              eyebrow="Fee Proposal"
              title="One Standard licence."
              lead="No tiers. Unlimited users. Pay only for cloud storage over 5 GB — AI is unmetered."
            />
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

        {/* A-06 · Handover */}
        <section id="handover" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead
              sheet="A-06"
              eyebrow="Handover"
              title="Open source for now. Web-only, one hub."
              lead="Soft launch: office hub landing and blog are live. Workspace sign-in is coming soon — start with why the hub exists."
            />
            {HANDOVER.map((s) => (
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
                Architecture studios — sign in and start managing the office on one hub.
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

        {/* A-07 · RFI (Request for Information) */}
        <section id="rfi" style={{ padding: SECTION_PAD }}>
          <Grid>
            <SheetHead sheet="A-07" eyebrow="RFI" title="Requests for information practices ask first" />
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

        {/* Footer — the title block */}
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
                Sheet index
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Sheet index">
                {SHEET_INDEX.map((s) => (
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
                  <a key={l.href} href={l.href} className="cds--link">
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
