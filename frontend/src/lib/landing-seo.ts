/** Landing-page SEO — platform home `/`. Keep in sync with index.html meta tags. */
import {
  AORMS_CONSULTANCY,
  AORMS_PMC,
  AORMS_PLATFORM,
  AORMS_STUDIO,
  EOMS,
  ESTI,
} from "./product-nomenclature.js";

export const LANDING_SEO = {
  title: `AORMS | ${AORMS_PLATFORM.expansion}`,
  description:
    "Operational and design frameworks for AEC consulting and PMC firms — architecture, engineering, and project management consultancies on one spine with EOMS intelligence.",
  keywords:
    "AORMS, EOMS, AEC consulting, AStudio, AConsulting, AProc, architecture consultancy software, engineering consultancy software, PMC software, operational framework, design framework, workflow consolidation",
  ogTitle: `AORMS — ${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  ogDescription:
    "Accelerated Operational Resources Management System: three apps — AStudio (architecture), AConsulting (engineering), AProc (PMC). One spine.",
  twitterTitle: "AORMS — frameworks for AEC consultancies",
  twitterDescription:
    `Operational + design frameworks for architecture, engineering, and PMC consultancies. ${AORMS_STUDIO.title} and ${AORMS_CONSULTANCY.title} live; ${AORMS_PMC.title} in preview.`,
  headline: `${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  footerBlurb: `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}).`,
  canonical: "https://aorms.in/",
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/wiki",
} as const;

export const LANDING_FAQ = [
  {
    question: "What is AORMS?",
    answer:
      `AORMS (Accelerated Operational Resources Management System) is a pre-release platform for AEC consulting and project management firms — architecture, engineering, and PMC practices. It combines an operational framework and a design framework on one spine, with ${EOMS.name} as the ${EOMS.role.toLowerCase()} and ${ESTI.name} as the ${ESTI.role.toLowerCase()} in ${AORMS_STUDIO.title}.`,
  },
  {
    question: "Who is the platform for?",
    answer:
      `AEC consulting and PMC firms — architecture, engineering, and project management practices of 5–500 people replacing scattered messaging, advisory workflows, documentation, email, sheets, and file sharing. ${AORMS_STUDIO.title} ships for architecture; ${AORMS_CONSULTANCY.title} for engineering; ${AORMS_PMC.title} for PMC (preview).`,
  },
  {
    question: `What are ${AORMS_STUDIO.title}, ${AORMS_CONSULTANCY.title}, and ${AORMS_PMC.title}?`,
    answer:
      `${AORMS_STUDIO.title} (${AORMS_STUDIO.expansion}) is the architecture consultancy app (live at ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")}). ${AORMS_CONSULTANCY.title} (${AORMS_CONSULTANCY.expansion}) is the engineering consultancy app (live at ${AORMS_CONSULTANCY.appUrl.replace(/^https:\/\//, "")}). ${AORMS_PMC.title} (${AORMS_PMC.expansion}) is the PMC app (preview at ${AORMS_PMC.appUrl.replace(/^https:\/\//, "")}). All share the same AORMS platform spine and ${EOMS.name}.`,
  },
  {
    question: "What are the operational and design frameworks?",
    answer:
      "The operational framework is how the consulting office runs — intake, process standards, review, audit, and governed knowledge. The design framework is how engagements are structured — methodologies, deliverable models, and versioned advisory templates. AORMS is built for AEC consultancies and PMC firms that advise and govern — not contractor ERP.",
  },
  {
    question: "What is the dual-tier AI architecture?",
    answer:
      `${EOMS.name} (${EOMS.expansion}) is the ${EOMS.role.toLowerCase()} — apps query it for authoritative codes and compliance. ${ESTI.name} (${ESTI.expansion}) is the ${ESTI.role.toLowerCase()} — it answers only from validated firm repositories. See the ${EOMS.name} + ${ESTI.name} section on this page.`,
  },
  {
    question: `Where is the ${AORMS_STUDIO.title} documentation?`,
    answer:
      `The ${AORMS_STUDIO.title} user guide lives at aorms.in/wiki — getting started, finance, workflows, and account setup for Indian architecture practices.`,
  },
  {
    question: "What is EOMS?",
    answer:
      `${EOMS.name} (${EOMS.expansion}) is the ${EOMS.role.toLowerCase()} on the AORMS platform — ${EOMS.summary}`,
  },
  {
    question: "What is ESTI?",
    answer:
      `${ESTI.name} (${ESTI.expansion}) is the ${ESTI.role.toLowerCase()} — ${ESTI.summary} Live in ${AORMS_STUDIO.title} and ${AORMS_CONSULTANCY.title} on the same spine.`,
  },
  {
    question: `What does ${AORMS_PMC.title} include?`,
    answer:
      `${AORMS_PMC.title} is owner-side PMC governance: master programme milestones (CSV and Primavera P6 XER import), package tenders with sealed contractor-portal bids, RA and steel certification, BBS and steel reconciliation — not a contractor labour ERP or full CPM engine. Preview at ${AORMS_PMC.appUrl.replace(/^https:\/\//, "")}.`,
  },
  {
    question: "Is this documentation the shipped product?",
    answer:
      `This page is the live platform home. Browser workspaces at ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")} and ${AORMS_CONSULTANCY.appUrl.replace(/^https:\/\//, "")} are live; ${AORMS_PMC.title} is in preview at ${AORMS_PMC.appUrl.replace(/^https:\/\//, "")}.`,
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
        "@type": "WebSite",
        "@id": "https://aorms.in/wiki#website",
        url: "https://aorms.in/wiki",
        name: AORMS_STUDIO.wikiName,
        description: `Official documentation for ${AORMS_STUDIO.title} on the AORMS platform.`,
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
          AORMS_STUDIO.expansion,
          AORMS_CONSULTANCY.title,
          AORMS_CONSULTANCY.expansion,
          AORMS_PMC.title,
          AORMS_PMC.expansion,
          EOMS.name,
          EOMS.expansion,
          ESTI.name,
          ESTI.expansion,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://aorms.in/",
        description: LANDING_SEO.description,
        featureList:
          "operational framework, design framework, collaboration, review and approval, audit and compliance, knowledge base, analytics dashboards, EOMS knowledge bank, ESTI internal AI agent",
        audience: {
          "@type": "Audience",
          audienceType:
            "AEC consulting and PMC firms — architecture, engineering, and project management consultancies (5–500 people)",
        },
        offers: {
          "@type": "Offer",
          name: `${AORMS_PLATFORM.name} platform`,
          description: `Pre-release platform. ${AORMS_STUDIO.title} and ${AORMS_CONSULTANCY.title} shipping; ${AORMS_PMC.title} in preview — standard licence (desktop + web).`,
          url: `https://aorms.in/login`,
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
