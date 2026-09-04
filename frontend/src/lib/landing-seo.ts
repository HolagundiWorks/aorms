/** Landing-page SEO — platform home `/`. Keep in sync with index.html meta tags. */
import { AORMS_PLATFORM, EOMS, ESTI } from "./product-nomenclature.js";
import { isMarketingOnly } from "./marketing-gate.js";

export const LANDING_SEO = {
  title: `AORMS | ${AORMS_PLATFORM.expansion}`,
  description:
    "AORMS — the office management system for AEC firms. Manage clients, projects, proposals, invoicing, team, and knowledge. Web-based, cloud-only. For architecture studios, engineering consultancies, and PMC practices.",
  keywords:
    "AORMS, office management, architecture software, engineering software, project management, invoicing, team management, AEC consulting, practice management",
  ogTitle: `AORMS — ${AORMS_PLATFORM.heroHeadline[0]}`,
  ogDescription: AORMS_PLATFORM.heroHeadline[1],
  twitterTitle: "AORMS — Office management for AEC firms",
  twitterDescription:
    "Clients · Projects · Proposals · Invoicing · Team · Knowledge. Web-based, cloud-only office hub.",
  headline: `${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  footerBlurb: `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}) — office hub home and blog.`,
  canonical: "https://aorms.in/",
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/blog",
} as const;

export const LANDING_FAQ = [
  {
    question: "What is AORMS?",
    answer:
      `AORMS (${AORMS_PLATFORM.expansion}) is a web-based office management system for AEC firms. ${AORMS_PLATFORM.tagline}. ${EOMS.name} provides the knowledge bank; ${ESTI.name} is the built-in office automation AI agent.`,
  },
  {
    question: "Who is AORMS for?",
    answer:
      "Architecture studios, engineering consultancies, and PMC practices that manage clients, projects, proposals, invoicing, teams, and knowledge.",
  },
  {
    question: "What can I do with AORMS?",
    answer:
      "Manage clients and projects, create proposals and contracts, handle invoicing and finance, coordinate teams, track deliverables, maintain a knowledge base, and get AI-powered insights and recommendations.",
  },
  {
    question: "Is AORMS cloud-based or desktop?",
    answer:
      "AORMS is a web-based, cloud-only application. Access it from any browser. No installers or local software required.",
  },
  {
    question: "Can I sign in on aorms.in today?",
    answer:
      "Yes, sign in at aorms.in/login to access your office hub workspace.",
  },
  {
    question: "How is AORMS licensed?",
    answer:
      "AORMS is available under Standard licence with usage-based billing. See aorms.in/pricing for details.",
  },
] as const;

/** FAQ rows for the SPA — sign-in answer follows the S8 marketing gate. */
export function getLandingFaq(): ReadonlyArray<{ question: string; answer: string }> {
  return LANDING_FAQ.map((item) => {
    if (item.question !== "Can I sign in on aorms.in today?") return item;
    if (isMarketingOnly()) return item;
    return {
      question: item.question,
      answer:
        "Firm portal demos and account sign-in are available on aorms.in/login (portals tab). Staff practice work runs on desktop via AORMS Connect — not the marketing apex.",
    };
  });
}

export function applyLandingSeo(): void {
  document.title = LANDING_SEO.title;

  const setMeta = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", LANDING_SEO.description);
  setMeta('meta[name="keywords"]', "content", LANDING_SEO.keywords);
  setMeta('meta[property="og:title"]', "content", LANDING_SEO.ogTitle);
  setMeta('meta[property="og:description"]', "content", LANDING_SEO.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", LANDING_SEO.twitterTitle);
  setMeta('meta[name="twitter:description"]', "content", LANDING_SEO.twitterDescription);
  setMeta('link[rel="canonical"]', "href", LANDING_SEO.canonical);
}

/** Runtime JSON-LD refresh — aligns SPA with product law after hydration. */
export function injectLandingJsonLd(): void {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://aorms.in/#website",
        url: "https://aorms.in/",
        name: "AORMS",
        description: LANDING_SEO.description,
        inLanguage: "en-IN",
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://aorms.in/#organization",
        name: "Human Centric Works",
        url: "https://aorms.in",
        email: "hi@aorms.in",
        telephone: "+91-8951089191",
        logo: "https://aorms.in/hcw-black.png",
        sameAs: ["https://www.linkedin.com/company/aorms"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Hospet",
          addressRegion: "Karnataka",
          addressCountry: "IN",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://aorms.in/#software",
        name: AORMS_PLATFORM.name,
        alternateName: [
          AORMS_PLATFORM.expansion,
          EOMS.name,
          ESTI.name,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://aorms.in/",
        description: LANDING_SEO.description,
        featureList:
          "client management, project tracking, proposals, invoicing, team coordination, knowledge base, firm portals, EOMS knowledge bank, ESTI AI agent",
        audience: {
          "@type": "Audience",
          audienceType:
            "Architecture studios, engineering consultancies, and PMC practices",
        },
        offers: {
          "@type": "Offer",
          name: `${AORMS_PLATFORM.name} office hub`,
          description:
            "Web-based office management system for AEC firms.",
          url: "https://aorms.in/",
        },
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": "https://aorms.in/#faq",
        mainEntity: getLandingFaq().map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const id = "esti-landing-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(graph);
}
