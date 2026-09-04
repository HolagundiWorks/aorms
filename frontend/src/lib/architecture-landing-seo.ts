/** SEO for /login — AStudio entry (soft launch: Coming soon on apex). */
import { AORMS_STUDIO, AORMS_PLATFORM, EOMS, ESTI } from "./product-nomenclature.js";

const BASE = "https://aorms.in/";
const LEGACY_SLUGS = AORMS_STUDIO.legacySlugs.join(", ");

export const ARCHITECTURE_LANDING_SEO = {
  title: `${AORMS_STUDIO.title} | Architecture practice manager on AORMS`,
  description:
    `${AORMS_STUDIO.title} is the architecture practice manager in the AORMS suite — tasks, office, portal communications. Technical calc stays in AQC apps; drafting in ADraft. Soft launch: sign-in coming soon.`,
  keywords:
    `architecture practice manager, AStudio, Accelerated Studio, AORMS suite, ${LEGACY_SLUGS}, ESTI, EOMS, AEC consulting`,
  ogTitle: `${AORMS_STUDIO.title} — architecture practice manager on AORMS`,
  ogDescription:
    `Part of the AORMS suite: managers for communications; technical work local. ${AORMS_STUDIO.title} does not own BOQ or CAD entities.`,
  twitterTitle: `${AORMS_STUDIO.title} — AORMS practice manager`,
  twitterDescription:
    "Architecture practice manager in the AORMS suite. Soft launch: suite home and blog live; sign-in coming soon.",
  headline: "From chaos to clarity. One living record for the practice.",
  footerBlurb: `${AORMS_STUDIO.title} on ${AORMS_PLATFORM.name}.`,
  canonical: `${BASE}`,
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/blog",
} as const;

export const ARCHITECTURE_LANDING_FAQ = [
  {
    question: `Who is ${AORMS_STUDIO.title} for?`,
    answer:
      "Architecture and design consultancies — practice managers for tasks, office, and portal communications within the AORMS suite.",
  },
  {
    question: "How does fee recovery work?",
    answer:
      "The practice manager keeps proposals, invoices, and project records together so revisions and stages stay billable — technical totals publish from AQC Estimation when issued.",
  },
  {
    question: "How is AORMS licensed?",
    answer:
      "Every account includes 5 GB storage and the full workspace. Pay only for additional storage per GB-month — AI is unmetered (local Ollama on desktop, the hub on web), with no per-token billing or bring-your-own key.",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "Yes — practice managers and technical apps ship as desktop installers (coming soon on /downloads). Soft launch: aorms.in is marketing and blog.",
  },
  {
    question: "Where is the documentation?",
    answer:
      "Start with the AORMS blog — why the suite matters, how it solves fragmented tools, and the suite map at aorms.in/blog.",
  },
  {
    question: `What are ${EOMS.name} and ${ESTI.name}?`,
    answer:
      `${EOMS.name} is the external knowledge bank for codes. ${ESTI.name} is the internal AI agent on desktop managers — answers from validated firm repositories.`,
  },
] as const;

export function applyArchitectureLandingSeo(): void {
  document.title = ARCHITECTURE_LANDING_SEO.title;

  const setMeta = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", ARCHITECTURE_LANDING_SEO.description);
  setMeta('meta[name="keywords"]', "content", ARCHITECTURE_LANDING_SEO.keywords);
  setMeta('meta[property="og:title"]', "content", ARCHITECTURE_LANDING_SEO.ogTitle);
  setMeta('meta[property="og:description"]', "content", ARCHITECTURE_LANDING_SEO.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", ARCHITECTURE_LANDING_SEO.twitterTitle);
  setMeta('meta[name="twitter:description"]', "content", ARCHITECTURE_LANDING_SEO.twitterDescription);
  setMeta('link[rel="canonical"]', "href", ARCHITECTURE_LANDING_SEO.canonical);
}

export function injectArchitectureLandingJsonLd(): void {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#webpage`,
        url: ARCHITECTURE_LANDING_SEO.canonical,
        name: ARCHITECTURE_LANDING_SEO.ogTitle,
        description: ARCHITECTURE_LANDING_SEO.description,
        isPartOf: { "@id": "https://aorms.in/#website" },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#software`,
        name: AORMS_STUDIO.title,
        alternateName: [
          AORMS_PLATFORM.expansion,
          ESTI.name,
          ESTI.expansion,
          ...AORMS_STUDIO.legacySlugs,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Windows, Web",
        url: AORMS_STUDIO.appUrl,
        description: ARCHITECTURE_LANDING_SEO.description,
        audience: {
          "@type": "Audience",
          audienceType: AORMS_STUDIO.audience,
        },
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#faq`,
        mainEntity: ARCHITECTURE_LANDING_FAQ.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(graph);
  document.head.appendChild(script);
}
