import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Accordion, AccordionItem } from "@carbon/react";
import { createClient } from "../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../lib/platform/service";
import { portalUrl } from "../lib/platform/subdomains";
import { roleHome } from "../lib/auth/role-home";
import { listBlogPosts } from "../lib/blog";
import { HeroCtas, LiveDemoCtas, FinalCtas, ConnectDexCtas } from "../components/aorms/LandingButtons";
import { BillingForecastPanel } from "../components/aorms/BillingForecastPanel";
import { TodaysBriefingPanel } from "../components/aorms/TodaysBriefingPanel";
import { PlanGlyph } from "../components/aorms/PlanGlyph";
import { OperationalLeakageCalculator } from "../components/aorms/landing/OperationalLeakageCalculator";
import { Artboards, type Board } from "../components/aorms/landing/Artboards";
import {
  AORMS_PLATFORM,
  AUTOMATION_SECTION,
  CONNECTDEX,
  CONTROL_SECTION,
  DEMO,
  ESTI_SECTION,
  FAQ,
  FEE_RECOVERY,
  HUMAN_CENTRIC_WORKS,
  OPERATIONAL_LEAKAGE,
  PRICING,
  PROBLEM,
  PRODUCT_SCREENSHOTS,
  PROJECT_RECORD,
  PULSE_SECTION,
  REVISION_MANAGEMENT,
} from "../lib/marketing-content";

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
 * web/'s public marketing landing page — redesigned 2026-10-02 to the hcworks.in layout:
 * numbered "artboards", one open at a time (see components/aorms/landing/Artboards.tsx),
 * each a two-column sheet — the write-up on the left, "the result" on the right. The
 * sequence follows the order a practice meets its own problem: the question → the
 * scatter → the daily brief → fees and revisions → the project record → automation and
 * ESTI → what leakage costs → who holds the data → price → the live demo → start.
 * Copy is the same product claims as before (marketing-content.ts), reorganised; nothing
 * here promises a feature the app doesn't have.
 *
 * Signed-in visitors land on their role's home; signed-out visitors get this page.
 */

function Sheet({
  eyebrow,
  display,
  h1,
  lede,
  side,
  children,
}: {
  eyebrow: string;
  display: string;
  h1?: boolean;
  lede?: string[];
  side?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const Heading = h1 ? "h1" : "h2";
  return (
    <div className="aorms-lp-grid">
      <div>
        <p className="aorms-lp-eyebrow">{eyebrow}</p>
        <Heading className="aorms-lp-display">{display}</Heading>
        {lede?.map((l) => (
          <p key={l} className="aorms-lp-lede">
            {l}
          </p>
        ))}
        {children}
      </div>
      {side && <div className="aorms-lp-side">{side}</div>}
    </div>
  );
}

function Cards({ items }: { items: { tag: string; text: string; badge?: string }[] }) {
  return (
    <div className="aorms-lp-cards">
      {items.map((c) => (
        <div key={c.tag} className="aorms-lp-card">
          <h3>
            {c.tag}
            {c.badge ? ` · ${c.badge}` : ""}
          </h3>
          <p>{c.text}</p>
        </div>
      ))}
    </div>
  );
}

function Result({ statement, text }: { statement: string; text: string }) {
  return (
    <div className="aorms-lp-result">
      <p className="aorms-lp-result__label">The result</p>
      <p className="aorms-lp-result__statement">{statement}</p>
      <p>{text}</p>
    </div>
  );
}

const Sub = ({ children }: { children: React.ReactNode }) => <p className="aorms-lp-sub">{children}</p>;

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

  const plans = [
    { key: "FREE", plan: PRICING.free, price: "₹0", suffix: "", sub: "" },
    { key: "STUDIO", plan: PRICING.studio, price: formatRupees(livePrice("STUDIO") / 12), suffix: "/month", sub: `${formatRupees(livePrice("STUDIO"))}/year, billed annually` },
    { key: "PROFESSIONAL", plan: PRICING.professional, price: formatRupees(livePrice("PROFESSIONAL") / 12), suffix: "/month", sub: `${formatRupees(livePrice("PROFESSIONAL"))}/year, billed annually` },
    { key: "ENTERPRISE", plan: PRICING.enterprise, price: `From ${formatRupees(livePrice("ENTERPRISE"))}`, suffix: "/year", sub: "" },
  ];

  const boards: Board[] = [
    {
      id: "top",
      num: "00",
      title: "The Start",
      children: (
        <Sheet
          h1
          eyebrow={`00 · ${AORMS_PLATFORM.expansion}`}
          display={"Where does the practice\nstand today?"}
          lede={[
            "In most architecture offices the answer lives in WhatsApp threads, spreadsheets, a drawing folder and somebody's memory.",
            AORMS_PLATFORM.heroSupport,
          ]}
          side={
            <>
              <Result statement="One operating record." text="Not another tool to feed — the record the practice already produces, kept in one place, so the answer is one page." />
              <PlanGlyph seed="aorms-landing" builtUpSqm={420} siteSqm={600} floors={2} height={150} />
            </>
          }
        >
          <ul className="aorms-lp-list">
            <li>What is due today?</li>
            <li>What did the client approve?</li>
            <li>What can we bill?</li>
            <li>Who is overloaded?</li>
          </ul>
          <HeroCtas />
          <Sub>AORMS keeps</Sub>
          <Cards
            items={[
              { tag: "Clients", text: "Who they are, what they have approved, what they owe." },
              { tag: "Projects", text: "Phases, tasks, meetings and drawings on one record." },
              { tag: "Fees", text: "Progress against each phase's fee — always a live figure." },
              { tag: "Revisions", text: "Every change tagged, assessed and approved before it is built." },
              { tag: "Team", text: "Who is on what, and who has too much." },
              { tag: "Site", text: "Visits, inspections and instructions tied to the project." },
            ]}
          />
        </Sheet>
      ),
    },
    {
      id: "problem",
      num: "01",
      title: "The Problem",
      children: (
        <Sheet
          eyebrow={`01 · ${PROBLEM.eyebrow}`}
          display={PROBLEM.title}
          lede={[PROBLEM.body]}
          side={<Result statement={PROBLEM.resolution.lines.join(". ") + "."} text="One practice, one operating record, one source of truth." />}
        >
          <div className="aorms-lp-chain" aria-label="Where project information scatters">
            {PROBLEM.chain.map((c, i) => (
              <span key={c} style={{ display: "contents" }}>
                <span>{c}</span>
                {i < PROBLEM.chain.length - 1 && (
                  <span className="aorms-lp-chain__sep" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <Sub>{PROBLEM.without.title}</Sub>
          <ul className="aorms-lp-list">
            {PROBLEM.without.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <Sub>{PROBLEM.with.title}</Sub>
          <ul className="aorms-lp-list">
            {PROBLEM.with.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Sheet>
      ),
    },
    {
      id: "pulse",
      num: "02",
      title: "Pulse",
      children: (
        <Sheet
          eyebrow={`02 · ${PULSE_SECTION.eyebrow}`}
          display={PULSE_SECTION.title}
          lede={[PULSE_SECTION.body]}
          side={
            <>
              <Result statement="A briefed morning." text="What changed, what is urgent, what is billable and what needs attention — written the moment the page loads, from your own records." />
              <TodaysBriefingPanel />
            </>
          }
        >
          <Sub>{PULSE_SECTION.sampleBrief.greeting}</Sub>
          <ul className="aorms-lp-list">
            {PULSE_SECTION.sampleBrief.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Sheet>
      ),
    },
    {
      id: "fee-recovery",
      num: "03",
      title: "Fees & Revisions",
      aliases: ["revision-management"],
      children: (
        <Sheet
          eyebrow={`03 · ${FEE_RECOVERY.eyebrow}`}
          display={FEE_RECOVERY.title}
          lede={[FEE_RECOVERY.body]}
          side={
            <>
              <Result statement="Billing without the month-end scramble." text="What is earned and billable is a live figure, and no client change is built before it is on the record." />
              <BillingForecastPanel />
            </>
          }
        >
          <div className="aorms-lp-chain" aria-label="From work to payment">
            {FEE_RECOVERY.chain.map((c, i) => (
              <span key={c} style={{ display: "contents" }}>
                <span>{c}</span>
                {i < FEE_RECOVERY.chain.length - 1 && (
                  <span className="aorms-lp-chain__sep" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <Sub>{REVISION_MANAGEMENT.eyebrow} — {REVISION_MANAGEMENT.title}</Sub>
          <p className="aorms-lp-lede" style={{ marginBlockStart: 0 }}>
            {REVISION_MANAGEMENT.body}
          </p>
          <Cards items={REVISION_MANAGEMENT.stages.map((st) => ({ tag: `${st.n} ${st.title}`, text: st.body }))} />
        </Sheet>
      ),
    },
    {
      id: "project-record",
      num: "04",
      title: "Project Record",
      children: (
        <Sheet
          eyebrow={`04 · ${PROJECT_RECORD.eyebrow}`}
          display={PROJECT_RECORD.title}
          lede={[PROJECT_RECORD.body]}
          side={
            <>
              <Result statement="The status is one page." text="Not a search through a chat thread, an inbox and someone's personal spreadsheet." />
              <figure className="aorms-lp-shot">
                <Image src={PRODUCT_SCREENSHOTS[2].src} alt={PRODUCT_SCREENSHOTS[2].alt} width={1440} height={900} sizes="(max-width: 1056px) 100vw, 30vw" />
                <figcaption>{PRODUCT_SCREENSHOTS[2].caption}</figcaption>
              </figure>
            </>
          }
        >
          <Sub>Every project carries</Sub>
          <Cards items={PROJECT_RECORD.fields.map((f) => ({ tag: f, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "automation",
      num: "05",
      title: "Automation & ESTI",
      aliases: ["esti"],
      children: (
        <Sheet
          eyebrow={`05 · ${AUTOMATION_SECTION.eyebrow} · ${ESTI_SECTION.eyebrow}`}
          display={AUTOMATION_SECTION.title}
          lede={[AUTOMATION_SECTION.body]}
          side={<Result statement="Routine work that runs itself." text={ESTI_SECTION.body} />}
        >
          {AUTOMATION_SECTION.flows.map((f) => (
            <div key={f.steps.join()} className="aorms-lp-chain">
              {f.steps.map((c, i) => (
                <span key={c} style={{ display: "contents" }}>
                  <span>{c}</span>
                  {i < f.steps.length - 1 && (
                    <span className="aorms-lp-chain__sep" aria-hidden>
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
          <Sub>{ESTI_SECTION.title}</Sub>
          <ul className="aorms-lp-list">
            {ESTI_SECTION.exampleQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Sheet>
      ),
    },
    {
      id: "roi",
      num: "06",
      title: "What it costs you",
      children: (
        <Sheet
          eyebrow="06 · Operational leakage"
          display={OPERATIONAL_LEAKAGE.title}
          lede={[OPERATIONAL_LEAKAGE.body]}
        >
          <div style={{ marginBlockStart: "1.5rem" }}>
            <OperationalLeakageCalculator />
          </div>
        </Sheet>
      ),
    },
    {
      id: "control",
      num: "07",
      title: "Your Data",
      children: (
        <Sheet
          eyebrow={`07 · ${CONTROL_SECTION.eyebrow}`}
          display={CONTROL_SECTION.title}
          lede={[CONTROL_SECTION.body]}
          side={<Result statement="Records you can leave with." text="Structured practice data stays under your account — not a closed system that locks your records in." />}
        >
          <Cards items={CONTROL_SECTION.rows.map((r) => ({ tag: r.title, badge: r.status, text: r.body }))} />
        </Sheet>
      ),
    },
    {
      id: "pricing",
      num: "08",
      title: "Pricing",
      children: (
        <Sheet
          eyebrow="08 · Pricing"
          display={"One practice. One subscription.\nNo per-seat tax."}
          lede={["AORMS is priced around the practice, not around every person who needs access."]}
          side={<Result statement="A price you can plan around." text="AI is included on every paid plan — no per-token billing. Create or join your Studio from your AORMS Identity once you are signed in." />}
        >
          <div className="aorms-lp-cards" style={{ marginBlockStart: "1.5rem" }}>
            {plans.map(({ key, plan, price, suffix, sub }) => (
              <div key={key} className="aorms-lp-card aorms-lp-card--ink" data-analytics-event={key === "STUDIO" ? "pricing_view" : undefined}>
                <h3>
                  {plan.name}
                  {"badge" in plan && plan.badge ? ` · ${plan.badge}` : ""}
                </h3>
                <p>{plan.tagline}</p>
                <p className="aorms-lp-price">
                  {price}
                  {suffix && <span style={{ fontSize: "0.875rem" }}>{suffix}</span>}
                </p>
                {sub && <p style={{ fontSize: "0.75rem" }}>{sub}</p>}
                <ul className="aorms-lp-list" style={{ marginBlockStart: "0.75rem" }}>
                  {plan.includes.map((line) => (
                    <li key={line} style={{ fontSize: "0.8125rem" }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "live-demo",
      num: "09",
      title: "See it",
      aliases: ["rfi"],
      children: (
        <Sheet
          eyebrow="09 · The live demo"
          display={"Don't take our word for it.\nOpen the practice."}
          lede={["Explore a working AORMS practice and see how projects, fees, revisions, people, and Pulse work together."]}
          side={
            <>
              <div className="aorms-lp-result">
                <p className="aorms-lp-result__label">Demo credentials</p>
                <p style={{ fontSize: "0.875rem", margin: "0.5rem 0", color: "var(--cds-text-secondary)" }}>
                  Read-only access to a sample studio — clients, projects, tasks, invoices, billing forecasts and revisions, reset nightly.
                </p>
                <p className="cds--type-code-01">
                  {DEMO.email}
                  <br />
                  {DEMO.password}
                </p>
              </div>
              <LiveDemoCtas />
            </>
          }
        >
          <div className="aorms-lp-cards" style={{ marginBlockStart: "1.5rem" }}>
            {PRODUCT_SCREENSHOTS.map((shot) => (
              <figure key={shot.src} className="aorms-lp-shot" style={{ margin: 0 }}>
                <Image src={shot.src} alt={shot.alt} width={1440} height={900} sizes="(max-width: 1056px) 100vw, 20vw" />
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
          <Sub>Requests for information practices ask first</Sub>
          <Accordion>
            {FAQ.map((item) => (
              <AccordionItem key={item.question} title={item.question}>
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {item.answer}
                </p>
              </AccordionItem>
            ))}
          </Accordion>
        </Sheet>
      ),
    },
    {
      id: "contact",
      num: "10",
      title: "Start",
      aliases: ["blog", "connectdex"],
      children: (
        <Sheet
          eyebrow="10 · Start"
          display={"Run your practice from\none operating record."}
          lede={["Projects. Fees. Revisions. People. One practice. One system."]}
          side={
            <>
              <Result statement="Start free." text="Free is a real, permanent plan — create your practice and add the first project today." />
              <div className="aorms-lp-card aorms-lp-card--ink">
                <h3>Talk to us</h3>
                <p>
                  <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}>{HUMAN_CENTRIC_WORKS.email}</a>
                  <br />
                  {HUMAN_CENTRIC_WORKS.location}
                </p>
              </div>
            </>
          }
        >
          <FinalCtas />
          {latestPosts.length > 0 && (
            <>
              <Sub>From the blog</Sub>
              <Cards
                items={latestPosts.map((p) => ({ tag: p.date, text: p.title }))}
              />
              <p style={{ marginBlockStart: "0.75rem" }}>
                {latestPosts.map((p) => (
                  <span key={p.slug} style={{ display: "block", padding: "0.25rem 0" }}>
                    <Link href={`/blog/${p.slug}`} className="cds--link">
                      {p.title}
                    </Link>
                  </span>
                ))}
                <Link href="/blog" className="cds--link">
                  View all posts →
                </Link>
              </p>
            </>
          )}
          <Sub>Also on AORMS</Sub>
          <p className="aorms-lp-lede" style={{ marginBlockStart: 0 }}>
            <strong style={{ color: "var(--cds-text-primary)" }}>{CONNECTDEX.name}</strong> — {CONNECTDEX.tagline}.
          </p>
          <ConnectDexCtas />
        </Sheet>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cds-background)", color: "var(--cds-text-primary)" }}>
      <a href="#main" className="aorms-skip-link">
        Skip to content
      </a>
      <header className="aorms-lp-bar">
        <Link href="/" aria-label="AORMS home" style={{ display: "flex", alignItems: "center" }}>
          <img src="/aorms-logo.png" alt="AORMS" width={91} height={24} style={{ height: "24px", width: "auto" }} />
        </Link>
        <nav aria-label="Primary">
          <Link href="#pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/login">Sign in</Link>
          <Link href="#live-demo">Explore the demo →</Link>
        </nav>
      </header>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <Artboards boards={boards} />
      <footer className="aorms-lp-foot">
        <span>
          {AORMS_PLATFORM.tagline} {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
        </span>
        <nav aria-label="Footer">
          <Link href="/blog">Blog</Link>
          <Link href="/connectdex-partners">Partners</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/legal">Terms</Link>
          <Link href="/login">Sign in</Link>
          <Link href={portalUrl("identity", "/platform-signup")}>Create practice</Link>
        </nav>
      </footer>
    </div>
  );
}
