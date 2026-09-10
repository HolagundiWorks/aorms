"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Close } from "@carbon/icons-react";

// Kept in sync with LandingHeader.tsx's desktop nav (2026-09-10 rebrand
// down to 4 items) — see that file's own comment for why Brief/
// Specification aren't separate links anymore.
const NAV_LINKS = [
  { href: "#identity", label: "Architect" },
  { href: "#connectdex", label: "ConnectDeX" },
  { href: "/blog", label: "Blog" },
  { href: "/login", label: "Sign in" },
] as const;

/**
 * Mobile-only nav (2026-09-10 — the header previously had no collapse
 * behavior at all; its text-link nav just wrapped onto extra lines on a
 * narrow viewport). A Client Component (needs open/closed state) shown
 * only below the `.landing-nav-desktop`/`.landing-nav-mobile-toggle`
 * breakpoint set in globals.scss — LandingHeader (a Server Component)
 * renders both this and the desktop nav unconditionally, and CSS decides
 * which one is actually visible, rather than this component trying to
 * detect viewport width itself (avoids a hydration mismatch between
 * server and client renders of "which nav is showing").
 */
export function MobileNavToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="landing-nav-mobile-toggle">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: 0, padding: "0.25rem", cursor: "pointer", display: "flex" }}
      >
        {open ? <Close size={24} /> : <Menu size={24} />}
      </button>
      {open && (
        <nav
          aria-label="Landing page sections"
          style={{
            position: "absolute",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            top: "100%",
            background: "var(--cds-background)",
            borderBottom: "1px solid var(--cds-border-subtle)",
            display: "flex",
            flexDirection: "column",
            padding: "0.5rem 1rem 1rem",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="cds--type-body-01"
              style={{ color: "inherit", textDecoration: "none", padding: "0.625rem 0" }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
