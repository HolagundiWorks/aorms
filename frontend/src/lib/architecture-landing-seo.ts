/** SEO metadata for office hub landing page — targeted at architecture practices in India. */
import { AORMS_OFFICE_HUB, AORMS_PLATFORM, ESTI } from "./product-nomenclature.js";

const BASE = "https://aorms.in/";

export const ARCHITECTURE_LANDING_SEO = {
  title: `${AORMS_PLATFORM.name} — Practice Management Software for Architects`,
  description:
    `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}) is the office hub built for architecture practices: clients, projects, fee proposals, GST invoicing, drawings, and team — one record, not six apps.`,
  keywords:
    `architecture practice management software, architect office management system, architecture firm ERP, practice management for architects India, COA compliant architecture software, GST invoicing for architects, architecture project management, fee proposal software, architecture studio software, ${ESTI.name}`,
  ogTitle: `${AORMS_PLATFORM.name} — Practice management for architects`,
  ogDescription:
    `The office hub built for ${AORMS_PLATFORM.aecDisciplines.join(", ").toLowerCase()} practices — clients, projects, fee proposals, GST invoicing, drawings, and team on one record.`,
  twitterTitle: `${AORMS_PLATFORM.name} — Practice management for architects`,
  twitterDescription:
    `One office hub for architecture practices: clients, projects, fee proposals, GST invoicing, drawings, team. Web-only, cloud-hosted.`,
  headline: "Run your practice the way you run a drawing set.",
  footerBlurb: `${AORMS_OFFICE_HUB.title} on ${AORMS_PLATFORM.name}.`,
  canonical: `${BASE}`,
  siteName: AORMS_PLATFORM.name,
} as const;

export const ARCHITECTURE_LANDING_FAQ = [
  {
    question: `What is ${AORMS_PLATFORM.name}?`,
    answer:
      `${AORMS_PLATFORM.name} — ${AORMS_PLATFORM.expansion} — is a web-based office hub built specifically for ${AORMS_PLATFORM.aecDisciplines.join(", ").toLowerCase()} practices: clients, projects, fee proposals, GST-compliant invoicing, team roster, a knowledge bank, and delivery tracking, all cross-referenced on one record instead of scattered across a spreadsheet, an inbox, and a separate invoicing tool.`,
  },
  {
    question: "How is this different from generic project management software?",
    answer:
      `Generic tools (Trello, Asana, Notion) know tasks and boards, not architectural practice. ${AORMS_PLATFORM.name} understands COA fee scales, GST/TDS on professional fees, phase-wise billing tied to RIBA/COA work stages, drawing revisions, and client approval gates — because it was built around how an Indian architecture office actually runs a project, not adapted from a generic template.`,
  },
  {
    question: "How does fee recovery work?",
    answer:
      "Clients, projects, proposals, and invoices sit on one linked record. A fee proposal references its project; an invoice references its proposal and phase. Nothing is re-typed, nothing drifts out of sync, and every rupee owed traces back to the drawing that earned it.",
  },
  {
    question: "Is AORMS compliant with COA fee scales and Indian GST/TDS rules?",
    answer:
      "Fee proposals benchmark against the Council of Architecture's scale of charges and flag below-minimum quotes for an audited override. Invoices carry a frozen GST/TDS snapshot (CGST/SGST/IGST, place of supply, Section 194J deduction) at the moment they're issued, so a later edit to your firm or client record never rewrites a document already sent.",
  },
  {
    question: "How is AORMS licensed?",
    answer:
      "One Standard licence — unlimited users, the full office hub, and cloud storage included. Pay only for storage above your allocation. AI is built in and unmetered — no per-token billing, no separate API key to manage.",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "No. AORMS is a web-only office management system. Sign in from a browser on any device — laptop at the studio, tablet on site. No installers, no desktop apps, no local-first setup.",
  },
  {
    question: `What is ${ESTI.name}?`,
    answer:
      `${ESTI.name} (${ESTI.expansion}) is the built-in AI agent — it answers only from your own firm's validated records, drafts documents, and surfaces what needs attention. It never trains a third-party model on your data.`,
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
  setMeta('meta[property="og:url"]', "content", ARCHITECTURE_LANDING_SEO.canonical);
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
        about: { "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#software` },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#software`,
        name: AORMS_OFFICE_HUB.title,
        alternateName: [AORMS_PLATFORM.name, AORMS_PLATFORM.expansion, ESTI.name, ESTI.expansion],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Architecture practice management software",
        operatingSystem: "Web",
        url: AORMS_OFFICE_HUB.appUrl,
        description: ARCHITECTURE_LANDING_SEO.description,
        offers: {
          "@type": "Offer",
          category: "Subscription",
          description: "One Standard licence — unlimited users, full office hub, 5 GB storage included.",
        },
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
      {
        "@type": "BreadcrumbList",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: AORMS_PLATFORM.name, item: ARCHITECTURE_LANDING_SEO.canonical },
        ],
      },
    ],
  };

  const existing = document.getElementById("architecture-landing-jsonld");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = "architecture-landing-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(graph);
  document.head.appendChild(script);
}
