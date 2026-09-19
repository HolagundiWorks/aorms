import type { Metadata, Viewport } from "next";
import "./globals.scss";
import { PwaServiceWorker } from "../components/aorms/PwaServiceWorker";

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
/**
 * 2026-09-14 landing rebuild — title/description/keywords rewritten to
 * match the "AORMS Landing Page & Pricing" developer spec §35. See
 * app/page.tsx's own metadata export, which overrides these for the
 * homepage itself (Next's `title.template` doesn't cascade to a route
 * segment at the same level as the layout defining it) — kept in sync
 * with the spec's exact wording here too so a page that DOES inherit the
 * default (anything without its own metadata export) still reads right.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://aorms.in"),
  title: {
    default: "AORMS — Architecture Practice Operating System",
    template: "%s — AORMS",
  },
  description:
    "AORMS is an operating system for architecture practices, connecting projects, fees, revisions, billing, approvals, teams, and practice intelligence in one platform.",
  keywords: [
    "architecture practice management software",
    "architecture firm management software",
    "architecture project management software India",
    "architecture billing software",
    "architecture practice ERP",
    "architecture office management software",
    "architecture project tracking software",
  ],
  authors: [{ name: "Human Centric Works" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "AORMS",
    title: "AORMS — Architecture Practice Operating System",
    description:
      "AORMS is an operating system for architecture practices, connecting projects, fees, revisions, billing, approvals, teams, and practice intelligence in one platform.",
    url: "https://aorms.in",
    locale: "en_IN",
    images: [{ url: "/aorms-logo.png", width: 816, height: 216, alt: "AORMS" }],
  },
  twitter: {
    card: "summary",
    title: "AORMS — Architecture Practice Operating System",
    description:
      "AORMS is an operating system for architecture practices, connecting projects, fees, revisions, billing, approvals, teams, and practice intelligence in one platform.",
    images: ["/aorms-logo.png"],
  },
};

/**
 * 2026-09-19 — PWA installability (app/manifest.ts). themeColor matches
 * the manifest's own (Carbon Blue 60, #0f62fe) so the installed app's
 * Android status bar and this same color agree; Next injects both the
 * `<meta name="theme-color">` tag and the manifest `<link>` from these
 * two exports automatically — neither needs a manual <head> tag.
 */
export const viewport: Viewport = {
  themeColor: "#0f62fe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Preload the one font weight nearly every element on first
            paint needs (body text renders at 400) — self-hosted
            IBM Plex Sans, see globals.scss's @font-face block for why
            this exists at all (2026-09-14 CWV/SEO audit). SemiBold/Bold/
            mono aren't preloaded: they're each used on a smaller share
            of first-paint content, so preloading them too would compete
            with this one for bandwidth rather than help LCP. */}
        <link rel="preload" href="/fonts/plex-sans/IBMPlexSans-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <PwaServiceWorker />
        {children}
      </body>
    </html>
  );
}
