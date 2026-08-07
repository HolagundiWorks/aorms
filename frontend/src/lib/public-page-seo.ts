/** SEO helpers for unauthenticated public pages (auth, 404 slugs). */
import { AORMS_STUDIO } from "./product-nomenclature.js";

function setMeta(selector: string, attr: "content" | "href", value: string) {
  document.querySelector(selector)?.setAttribute(attr, value);
}

function setRobotsNoindex(noindex: boolean) {
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);
  }
  robots.setAttribute("content", noindex ? "noindex" : "index,follow");
}

export function applyPublicPageSeo(opts: {
  title: string;
  description: string;
  /** Path only, e.g. `/signup` — canonical is origin + path. */
  path: string;
  noindex?: boolean;
}): void {
  const origin = window.location.origin;
  const canonical = `${origin}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;

  document.title = opts.title;
  setMeta('meta[name="description"]', "content", opts.description);
  setMeta('meta[property="og:title"]', "content", opts.title);
  setMeta('meta[property="og:description"]', "content", opts.description);
  setMeta('meta[property="og:url"]', "content", canonical);
  setMeta('meta[name="twitter:title"]', "content", opts.title);
  setMeta('meta[name="twitter:description"]', "content", opts.description);
  setMeta('link[rel="canonical"]', "href", canonical);
  setRobotsNoindex(Boolean(opts.noindex));
}

export function applyPublicNotFoundSeo(label: string): void {
  applyPublicPageSeo({
    title: `${label} not found — AORMS`,
    description: `This ${label.toLowerCase()} does not exist on aorms.in. Browse the wiki, blog, or sign in to ${AORMS_STUDIO.title}.`,
    path: window.location.pathname,
    noindex: true,
  });
}

export const AUTH_PAGE_SEO = {
  login: {
    title: `Sign in — ${AORMS_STUDIO.title}`,
    description:
      `Sign in to your ${AORMS_STUDIO.title} architecture consultancy workspace. Google or email — then open your studio, account, or company.`,
    path: "/login",
  },
  signup: {
    title: "Set up your workspace — AORMS",
    description:
      "Create your firm and admin account on a fresh AORMS install. Standard licence includes the full workspace and 5 GB storage.",
    path: "/signup",
  },
  forgotPassword: {
    title: "Reset password — AORMS",
    description: `Request a password reset link for your ${AORMS_STUDIO.title} workspace account.`,
    path: "/forgot-password",
  },
  resetPassword: {
    title: "Choose a new password — AORMS",
    description: `Set a new password for your ${AORMS_STUDIO.title} workspace from your reset email link.`,
    path: "/reset-password",
  },
  externalAccess: {
    title: "External portal sign-in — AORMS",
    description:
      `Sign in to your client, consultant, contractor, or site portal. Office staff use ${AORMS_STUDIO.title} at /login.`,
    path: "/login?tab=portals",
  },
} as const;
