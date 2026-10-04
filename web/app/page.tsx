import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Accordion, AccordionItem } from "@carbon/react";
import { createClient } from "../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../lib/platform/service";
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
  CONNECTDEX,
  DEMO,
  ESTI_SECTION,
  FAQ,
  HUMAN_CENTRIC_WORKS,
  OPERATIONAL_LEAKAGE,
  PRICING,
  PRODUCT_SCREENSHOTS,
} from "../lib/marketing-content";
import {
  SPINE_ACCOUNTS,
  SPINE_CTA,
  SPINE_DATA,
  SPINE_DNA,
  SPINE_ESTI,
  SPINE_HERO,
  SPINE_KNOWLEDGE,
  SPINE_MODULES,
  SPINE_PROBLEM,
  SPINE_PROJECT,
  SPINE_SITE,
  SPINE_STAGES,
  SPINE_TENDER,
} from "../lib/marketing-spine";

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
  corner,
  children,
}: {
  eyebrow: string;
  display: string;
  h1?: boolean;
  lede?: string[];
  side?: React.ReactNode;
  /** A generated plan drawing pinned to the sheet's bottom-right corner (hcworks.in's "corner figure"). */
  corner?: { seed: string; builtUpSqm: number; siteSqm: number; floors: number };
  children?: React.ReactNode;
}) {
  const Heading = h1 ? "h1" : "h2";
  return (
    <>
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
    {corner && (
      <div className="aorms-lp-corner" aria-hidden>
        <PlanGlyph {...corner} height={220} />
      </div>
    )}
    </>
  );
}

function Cards({ items }: { items: { tag: string; text: string; badge?: string }[] }) {
  return (
    <div className="aorms-lp-cards">
      {items.map((c, i) => (
        <div key={`${c.tag}-${i}`} className="aorms-lp-card">
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
      short: "Start",
      title: "The Start",
      children: (
        <Sheet
          h1
          eyebrow={SPINE_HERO.eyebrow}
          display={SPINE_HERO.display}
          lede={[...SPINE_HERO.lede]}
          side={<Result statement={SPINE_HERO.statement} text="Not another tool to feed — the record the practice already produces, kept in one place, so the answer is one page." />}
          corner={{ seed: "aorms-landing", builtUpSqm: 420, siteSqm: 600, floors: 2 }}
        >
          <p className="aorms-lp-chips">{SPINE_HERO.connects.join(" · ")}</p>
          <HeroCtas />
        </Sheet>
      ),
    },
    {
      id: "problem",
      num: "01",
      short: "Problem",
      title: "The Problem",
      children: (
        <Sheet
          eyebrow="01 · The problem"
          display={SPINE_PROBLEM.display}
          lede={[...SPINE_PROBLEM.lede]}
          side={<Result statement="The distance between the information." text={SPINE_PROBLEM.point} />}
          corner={{ seed: "scatter", builtUpSqm: 300, siteSqm: 520, floors: 1 }}
        >
          <Cards items={SPINE_PROBLEM.scatter.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "spine",
      num: "02",
      short: "Spine",
      title: "The Project Spine",
      children: (
        <Sheet
          eyebrow="02 · The project spine"
          display={SPINE_STAGES.display}
          lede={[SPINE_STAGES.body]}
          side={<Result statement="One continuous record." text="From the first brief to maintenance, the project keeps its history — nothing is re-created at a hand-off." />}
          corner={{ seed: "spine", builtUpSqm: 520, siteSqm: 800, floors: 3 }}
        >
          <ol className="aorms-lp-spine" aria-label="Project stages, brief to maintenance">
            {SPINE_STAGES.stages.map((c, i) => (
              <li key={c}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {c}
              </li>
            ))}
          </ol>
        </Sheet>
      ),
    },
    {
      id: "office",
      num: "03",
      short: "Office",
      title: "The Office, Mapped",
      children: (
        <Sheet
          eyebrow="03 · Modules"
          display={SPINE_MODULES.display}
          side={<Result statement={SPINE_MODULES.foot} text="Seven modules, one project record underneath them." />}
        >
          <Cards items={[...SPINE_MODULES.modules]} />
        </Sheet>
      ),
    },
    {
      id: "project",
      num: "04",
      short: "Project",
      title: "The Project Is the Interface",
      aliases: ["project-record"],
      children: (
        <Sheet
          eyebrow="04 · The project page"
          display={SPINE_PROJECT.display}
          lede={[...SPINE_PROJECT.lede]}
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
          <Cards items={SPINE_PROJECT.tabs.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "dna",
      num: "05",
      short: "DNA",
      title: "Project DNA",
      children: (
        <Sheet
          eyebrow="05 · Signature concept"
          display={SPINE_DNA.display}
          lede={[...SPINE_DNA.lede]}
          side={<Result statement={SPINE_DNA.foot} text="Tasks, drawings, fees and decisions all hang off the same identity." />}
          corner={{ seed: "dna", builtUpSqm: 380, siteSqm: 700, floors: 2 }}
        >
          <Cards items={SPINE_DNA.fields.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "site",
      num: "06",
      short: "Site",
      title: "Site",
      children: (
        <Sheet
          eyebrow="06 · Site"
          display={SPINE_SITE.display}
          side={<Result statement="Recorded where it happened." text={SPINE_SITE.foot} />}
        >
          <Cards items={SPINE_SITE.items.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "tender",
      num: "07",
      short: "Tender",
      title: "Tender",
      children: (
        <Sheet
          eyebrow="07 · Tender"
          display={SPINE_TENDER.display}
          side={<Result statement="A traceable record." text={SPINE_TENDER.foot} />}
        >
          <div className="aorms-lp-chain" aria-label="Tender flow, BOQ to record">
            {SPINE_TENDER.flow.map((c, i, arr) => (
              <span key={c} style={{ display: "contents" }}>
                <span>{c}</span>
                {i < arr.length - 1 && (
                  <span className="aorms-lp-chain__sep" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "accounts",
      num: "08",
      short: "Accounts",
      title: "Accounts",
      aliases: ["fee-recovery", "revision-management"],
      children: (
        <Sheet
          eyebrow="08 · Accounts"
          display={SPINE_ACCOUNTS.display}
          lede={[SPINE_ACCOUNTS.foot]}
          side={
            <>
              <Result statement="Billing without the month-end scramble." text="What is earned and billable is a live figure, and no client change is built before it is on the record." />
              <BillingForecastPanel />
            </>
          }
        >
          <Cards items={SPINE_ACCOUNTS.figures.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "knowledge",
      num: "09",
      short: "Memory",
      title: "Knowledge Bank",
      children: (
        <Sheet
          eyebrow="09 · Knowledge Bank"
          display={SPINE_KNOWLEDGE.display}
          lede={[...SPINE_KNOWLEDGE.lede]}
          side={<Result statement="Institutional memory." text={SPINE_KNOWLEDGE.foot} />}
          corner={{ seed: "records", builtUpSqm: 640, siteSqm: 900, floors: 3 }}
        >
          <Cards items={SPINE_KNOWLEDGE.items.map((t) => ({ tag: t, text: "" }))} />
        </Sheet>
      ),
    },
    {
      id: "automation",
      num: "10",
      short: "Esti",
      title: "ESTI",
      aliases: ["esti", "pulse"],
      children: (
        <Sheet
          eyebrow="10 · ESTI"
          display={SPINE_ESTI.display}
          lede={[...SPINE_ESTI.lede]}
          side={
            <>
              <Result statement="Ask your practice, not the internet." text={ESTI_SECTION.body} />
              <TodaysBriefingPanel />
            </>
          }
        >
          <Sub>Ask ESTI</Sub>
          <ul className="aorms-lp-list">
            {SPINE_ESTI.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Sheet>
      ),
    },
    {
      id: "control",
      num: "11",
      short: "Data",
      title: "Your Data",
      children: (
        <Sheet
          eyebrow="11 · Control & ownership"
          display={SPINE_DATA.display}
          lede={[...SPINE_DATA.lede]}
          side={<Result statement="Records you can leave with." text="Structured practice data stays under your account — not a closed system that locks your records in." />}
        >
          <Cards items={[...SPINE_DATA.rows]} />
        </Sheet>
      ),
    },
    {
      id: "roi",
      num: "12",
      short: "Cost",
      title: "What it costs you",
      children: (
        <Sheet
          eyebrow="12 · Operational leakage"
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
      id: "pricing",
      num: "13",
      short: "Price",
      title: "Pricing",
      children: (
        <Sheet
          eyebrow="13 · Pricing"
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
      num: "14",
      short: "Demo",
      title: "See it",
      aliases: ["rfi"],
      children: (
        <Sheet
          eyebrow="14 · The live demo"
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
      num: "15",
      short: "Start",
      title: "Start",
      aliases: ["blog", "connectdex"],
      children: (
        <Sheet
          eyebrow="15 · AORMS"
          display={SPINE_CTA.display}
          lede={[...SPINE_CTA.lede]}
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <Artboards
        boards={boards}
        nameplate={{
          cta: { label: "Explore the demo →", href: "#live-demo" },
          studio: "AORMS",
          lines: [
            { text: HUMAN_CENTRIC_WORKS.email, href: `mailto:${HUMAN_CENTRIC_WORKS.email}` },
            { text: HUMAN_CENTRIC_WORKS.attribution },
            { text: HUMAN_CENTRIC_WORKS.location },
          ],
          links: [
            { label: "Sign in", href: "/login" },
            { label: "Blog", href: "/blog" },
            { label: "Partners", href: "/connectdex-partners" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/legal" },
          ],
        }}
      />
    </>
  );
}
