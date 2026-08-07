/** Landing-page SEO — platform home `/`. Keep in sync with index.html meta tags. */
import {
  AADT,
  AORMS_CONSULTANCY,
  AORMS_PMC,
  AORMS_PLATFORM,
  AORMS_STUDIO,
  AQC_BBS,
  AQC_ESTIMATION,
  EOMS,
  ESTI,
  SHILPIDB,
} from "./product-nomenclature.js";

export const LANDING_SEO = {
  title: `AORMS | ${AORMS_PLATFORM.expansion}`,
  description:
    "AORMS suite for AEC consultancies — practice managers, AQC Estimation/BBS/PM, AADT drafting, ShilpiDB drawings, and firm portals. Technical work stays local; aorms.in is marketing and blog. Open source; installers coming soon.",
  keywords:
    "AORMS, AStudio, AConsulting, AQC Estimation, AQC BBS, AProc, AADT, ShilpiDB, EOMS, ESTI, AEC consulting suite, practice management, local-first desktop, architecture software, engineering software, PMC software, fragmented tools",
  ogTitle: `AORMS — ${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  ogDescription:
    "One suite for AEC consultancies: managers for communications; Estimation, BBS, PM, and AADT locally; ShilpiDB for drawings; firm portals for published updates. Open source. Installers coming soon.",
  twitterTitle: "AORMS — the operating suite for AEC consultancies",
  twitterDescription:
    `${AORMS_STUDIO.title} · ${AORMS_CONSULTANCY.title} · ${AQC_ESTIMATION.title} · ${AQC_BBS.title} · ${AORMS_PMC.title} · ${AADT.title} · ${SHILPIDB.name}. Technical work local; portals online.`,
  headline: `${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  footerBlurb: `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}) — suite home and blog.`,
  canonical: "https://aorms.in/",
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/blog",
} as const;

export const LANDING_FAQ = [
  {
    question: "What is AORMS?",
    answer:
      `AORMS (${AORMS_PLATFORM.expansion}) is a product suite for AEC consulting and PMC firms — practice managers, technical desktop apps, AADT drafting, and ShilpiDB for drawings. ${EOMS.name} is the knowledge bank; ${ESTI.name} is the internal AI agent on desktop managers.`,
  },
  {
    question: "Why a suite instead of one mega-app?",
    answer:
      "Practice communications and commercial rhythm belong in managers. Heavy calc (BOQ, BBS, programme) and drafting stay on the desktop. Firm portals show published updates only. One cloud ERP that tries to own CAD drafts and payroll always fails trust or correctness.",
  },
  {
    question: "Who is the suite for?",
    answer:
      `AEC consulting and PMC firms — architecture, engineering, and project management practices that advise and govern projects. Not contractor labour ERP.`,
  },
  {
    question: `What are ${AORMS_STUDIO.title} and ${AORMS_CONSULTANCY.title}?`,
    answer:
      `Practice managers — Tasks, Office, HR, Payroll views, and portal communications. ${AORMS_STUDIO.title} for architecture; ${AORMS_CONSULTANCY.title} for engineering. They do not own BOQ math or CAD entities.`,
  },
  {
    question: "What are the AQC technical apps?",
    answer:
      `${AQC_ESTIMATION.title}, ${AQC_BBS.title}, and ${AORMS_PMC.suiteTitle ?? AORMS_PMC.title} (${AORMS_PMC.title}) are separate desktop installers sharing bbs_engine. They publish totals and issued PDFs — never draft lines — to firm portals.`,
  },
  {
    question: `What are ${AADT.title} and ${SHILPIDB.name}?`,
    answer:
      `${AADT.title} is local 2D CAD. ${SHILPIDB.name} is the geometry spine; portals see published drawing packages only.`,
  },
  {
    question: "How is AORMS licensed right now?",
    answer:
      "Open source for now. SaaS commercial licensing is deferred. Windows installers are listed as coming soon on aorms.in/downloads.",
  },
  {
    question: "Can I sign in on aorms.in today?",
    answer:
      "Soft launch: the suite home and blog are live. Workspace sign-in and firm-portal demos are coming soon. Follow the blog for release notes.",
  },
  {
    question: "Where do I learn how the suite solves fragmented tools?",
    answer:
      "Read the blog posts “Why the AORMS suite matters”, “How the AORMS suite solves fragmented practice tools”, and “AORMS suite map” at aorms.in/blog.",
  },
] as const;

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
          AORMS_STUDIO.title,
          AORMS_CONSULTANCY.title,
          AQC_ESTIMATION.title,
          AQC_BBS.title,
          AORMS_PMC.title,
          AADT.title,
          SHILPIDB.name,
          EOMS.name,
          ESTI.name,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Windows, Web",
        url: "https://aorms.in/",
        description: LANDING_SEO.description,
        featureList:
          "practice managers, AQC Estimation, AQC BBS, AQC Project Management, AADT drafting, ShilpiDB geometry, firm portals, local-first desktop, EOMS, ESTI, open source",
        audience: {
          "@type": "Audience",
          audienceType:
            "AEC consulting and PMC firms — architecture, engineering, and project management consultancies",
        },
        offers: {
          "@type": "Offer",
          name: `${AORMS_PLATFORM.name} suite`,
          description:
            "Open-source suite. Soft launch: marketing home and blog live; Windows installers coming soon.",
          url: "https://aorms.in/blog",
        },
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": "https://aorms.in/#faq",
        mainEntity: LANDING_FAQ.map((f) => ({
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
