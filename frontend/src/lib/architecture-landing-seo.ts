/** SEO metadata (legacy: was AStudio-specific, now office-hub focused). */
import { AORMS_OFFICE_HUB, AORMS_PLATFORM, EOMS, ESTI } from "./product-nomenclature.js";

const BASE = "https://aorms.in/";

export const ARCHITECTURE_LANDING_SEO = {
  title: `${AORMS_OFFICE_HUB.title} | Office Management System`,
  description:
    `${AORMS_OFFICE_HUB.title} — unified office management for AEC firms. Clients, projects, proposals, invoicing, team, knowledge, and delivery — all in one web hub.`,
  keywords:
    `office management, AEC consulting, practice manager, ESTI, EOMS, architecture, engineering, project management`,
  ogTitle: `${AORMS_OFFICE_HUB.title} — Office Management System`,
  ogDescription:
    `${AORMS_OFFICE_HUB.title} — unified office hub for ${AORMS_PLATFORM.aecDisciplines.join(", ")} practices.`,
  twitterTitle: `${AORMS_OFFICE_HUB.title} — Office Hub`,
  twitterDescription:
    `Unified office management for AEC firms. Cloud-based, no desktop apps required.`,
  headline: "One office hub for practices that design with precision.",
  footerBlurb: `${AORMS_OFFICE_HUB.title} on ${AORMS_PLATFORM.name}.`,
  canonical: `${BASE}`,
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/blog",
} as const;

export const ARCHITECTURE_LANDING_FAQ = [
  {
    question: `What is ${AORMS_OFFICE_HUB.title}?`,
    answer:
      `A unified web-based office management system for ${AORMS_PLATFORM.aecDisciplines.join(", ")} practices — clients, projects, proposals, invoicing, team roster, knowledge bank, and delivery tracking all in one place.`,
  },
  {
    question: "How does fee recovery work?",
    answer:
      "Track clients, projects, proposals, and invoices on one unified record. Proposals link to projects; invoices follow proposals. No spreadsheet archaeology.",
  },
  {
    question: "How is AORMS licensed?",
    answer:
      "One Standard licence — unlimited users, full office hub, and cloud storage included. Pay only for storage above your allocation. AI is built-in and unmetered (no per-token billing).",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "No. AORMS is now a web-only office management system. Access it from any browser on any device. No installers, no desktop apps, no local-first setup required.",
  },
  {
    question: "Where is the documentation?",
    answer:
      "Start with the AORMS blog at aorms.in/blog — why the office hub matters and how it solves fragmented tools. Full docs at docs.aorms.in.",
  },
  {
    question: `What are ${EOMS.name} and ${ESTI.name}?`,
    answer:
      `${EOMS.name} is the external knowledge bank for standard codes and compliance rules. ${ESTI.name} is the built-in AI agent that answers from your firm's own validated repositories.`,
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
        name: AORMS_OFFICE_HUB.title,
        alternateName: [AORMS_PLATFORM.expansion, ESTI.name, ESTI.expansion],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: AORMS_OFFICE_HUB.appUrl,
        description: ARCHITECTURE_LANDING_SEO.description,
        audience: {
          "@type": "Audience",
          audienceType: AORMS_PLATFORM.audience,
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
