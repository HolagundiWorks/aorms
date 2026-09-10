import type { Metadata } from "next";
import "./globals.scss";

/**
 * Root metadata (2026-09-10 — previously just title/description, no
 * OpenGraph/Twitter/robots/canonical at all). `metadataBase` is required
 * for the relative `images`/`url` paths below to resolve to absolute URLs
 * in the actual rendered `<meta>` tags — without it Next emits them
 * relative to whatever host served the request, which breaks on a page
 * shared from a URL other than the canonical one. `openGraph.images`
 * reuses the existing wordmark (`aorms-logo.png`, 816×216) — not a
 * proper 1200×630 social-share hero image, which doesn't exist yet; using
 * the wordmark is strictly better than no image at all, but a real OG
 * image is a follow-up, not solved here. Every page under `app/` inherits
 * this unless it sets its own `metadata` export (Next merges shallowly,
 * child wins per-field) — `app/page.tsx` does exactly that for its own
 * title/description.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://aorms.in"),
  title: {
    default: "AORMS — Office Management System",
    template: "%s — AORMS",
  },
  description: "Office management system for architecture practices.",
  keywords: ["architecture practice management", "AEC software", "architecture firm ERP", "COA fee proposal software", "India architecture software"],
  authors: [{ name: "Human Centric Works" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "AORMS",
    title: "AORMS — Office Management System",
    description: "Office management system for architecture practices.",
    url: "https://aorms.in",
    locale: "en_IN",
    images: [{ url: "/aorms-logo.png", width: 816, height: 216, alt: "AORMS" }],
  },
  twitter: {
    card: "summary",
    title: "AORMS — Office Management System",
    description: "Office management system for architecture practices.",
    images: ["/aorms-logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
