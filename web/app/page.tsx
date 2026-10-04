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
  FAQ,
  HUMAN_CENTRIC_WORKS,
  PRICING,
  PRODUCT_SCREENSHOTS,
} from "../lib/marketing-content";
import {
  SPINE_CTA,
  SPINE_HERO,
  SPINE_MEMORY,
  SPINE_OFFICE,
  SPINE_PROJECT,
  SPINE_SYSTEM,
  SPINE_WORKFLOW,
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
      num: "01",
      short: "Start",
      title: "Start",
      children: (
        <Sheet
          h1
          eyebrow={SPINE_HERO.eyebrow}
          display={SPINE_HERO.display}
          side={<Result statement={SPINE_HERO.statement} text="Not another tool to feed — the record the practice already produces, kept in one place, so the answer is one page." />}
          corner={{ seed: "aorms-landing", builtUpSqm: 420, siteSqm: 600, floors: 2 }}
        >
          <p className="aorms-lp-chips">{SPINE_HERO.connects.join(" · ")}</p>
          <HeroCtas />
        </Sheet>
      ),
    },
    {
      id: "project",
      num: "02",
      short: "Project",
      title: "The Project",
      aliases: ["spine", "problem", "dna", "project-record"],
      children: (
        <Sheet
          eyebrow="The project spine"
          display={SPINE_PROJECT.display}
          lede={[...SPINE_PROJECT.lede]}
          side={
            <>
              <Result statement="The status is one page." text={SPINE_PROJECT.foot} />
              <figure className="aorms-lp-shot">
                <Image src={PRODUCT_SCREENSHOTS[2].src} alt={PRODUCT_SCREENSHOTS[2].alt} width={1440} height={900} sizes="(max-width: 1056px) 100vw, 30vw" />
                <figcaption>{PRODUCT_SCREENSHOTS[2].caption}</figcaption>
              </figure>
            </>
          }
          corner={{ seed: "spine", builtUpSqm: 520, siteSqm: 800, floors: 3 }}
        >
          <div className="aorms-lp-chain" aria-label="Project stages, brief to handover">
            {SPINE_PROJECT.stages.map((c, i, arr) => (
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
          <Sub>Project DNA</Sub>
          <p className="aorms-lp-chips" style={{ marginBlockStart: 0 }}>{SPINE_PROJECT.dna.join(" · ")}</p>
        </Sheet>
      ),
    },
    {
      id: "office",
      num: "03",
      short: "Office",
      title: "The Office",
      aliases: ["site", "tender", "accounts", "fee-recovery", "revision-management"],
      children: (
        <Sheet
          eyebrow="The office"
          display={SPINE_OFFICE.display}
          side={
            <>
              <Result statement={SPINE_OFFICE.foot} text="Six parts of the practice, one project record underneath them." />
              <BillingForecastPanel />
            </>
          }
        >
          <Cards items={[...SPINE_OFFICE.matrix]} />
        </Sheet>
      ),
    },
    {
      id: "workflow",
      num: "04",
      short: "Flow",
      title: "The Workflow",
      children: (
        <Sheet
          eyebrow="The workflow"
          display={SPINE_WORKFLOW.display}
          side={<Result statement="Information that moves." text="What is captured on site or in a meeting becomes a task, a record and, in time, knowledge — without being re-typed." />}
          corner={{ seed: "routine", builtUpSqm: 640, siteSqm: 900, floors: 3 }}
        >
          <ol className="aorms-lp-spine aorms-lp-spine--flow" aria-label="From information to action">
            {SPINE_WORKFLOW.steps.map((st, i) => (
              <li key={st.tag}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{st.tag}</strong>
                  <small>{st.text}</small>
                </div>
              </li>
            ))}
          </ol>
        </Sheet>
      ),
    },
    {
      id: "memory",
      num: "05",
      short: "Memory",
      title: "The Memory",
      aliases: ["knowledge", "esti", "automation", "pulse"],
      children: (
        <Sheet
          eyebrow="The memory"
          display={SPINE_MEMORY.display}
          lede={[...SPINE_MEMORY.lede]}
          side={
            <>
              <Result statement="Ask the project." text={SPINE_MEMORY.esti} />
              <TodaysBriefingPanel />
            </>
          }
        >
          <Sub>Knowledge Bank</Sub>
          <p className="aorms-lp-chips" style={{ marginBlockStart: 0 }}>{SPINE_MEMORY.knowledge.join(" · ")}</p>
          <Sub>ESTI</Sub>
          <ul className="aorms-lp-list">
            {SPINE_MEMORY.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Sheet>
      ),
    },
    {
      id: "system",
      num: "06",
      short: "System",
      title: "The System",
      aliases: ["control", "roi", "pricing", "live-demo", "rfi"],
      children: (
        <Sheet
          eyebrow="The system"
          display={SPINE_SYSTEM.display}
          lede={[...SPINE_SYSTEM.lede]}
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
          <Cards items={[...SPINE_SYSTEM.rows]} />
          <Sub>See what it costs</Sub>
          <OperationalLeakageCalculator />
          <Sub>Pricing</Sub>
          <div className="aorms-lp-cards aorms-lp-cards--compact">
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
              </div>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "contact",
      num: "07",
      short: "Enter",
      title: "Enter AORMS",
      aliases: ["blog", "connectdex", "start"],
      children: (
        <Sheet
          eyebrow="Enter AORMS"
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
