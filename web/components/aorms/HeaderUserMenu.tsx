"use client";

/**
 * Header user identity + greeting + avatar + menu (2026-09-14,
 * shell/identity/KPI spec §5-8) — replaces the old standalone "Sign out"
 * icon-only HeaderGlobalAction with a real identity block: greeting +
 * name + role, an initials avatar, and the menu the spec calls for
 * (§8), opened by clicking the avatar. Same Popover/PopoverContent
 * pattern every other header widget already uses (HeaderWellness.tsx
 * etc.) — one consistent interaction family, no new Carbon component
 * (and no new Sass @use) introduced just for this.
 *
 * The menu is deliberately short: the spec's own §8 list (My Profile /
 * Preferences / Notifications / Organisation / Help & Support / Sign
 * out) names several pages that don't exist anywhere in this app yet
 * (no /profile, /preferences, /notifications route). Wiring dead links
 * into a menu would be exactly the "make it look done without it being
 * real" failure mode this app's own demo-audit brief singled out —
 * so this ships only the two real destinations: Firm Settings (the one
 * real settings page every staff member can already open) and Sign out.
 */
import { useState } from "react";
import Link from "next/link";
import { Popover, PopoverContent } from "@carbon/react";
import { ChevronDown } from "@carbon/icons-react";
import { signOut } from "../../lib/actions/auth";
import { getGreeting, getFirstName } from "../../lib/shell/identity";

export function HeaderUserMenu({
  name,
  role,
  initials,
  hour,
  hasMultipleStudios,
}: {
  name: string;
  role: string;
  initials: string;
  hour: number;
  /** True when this profile belongs to more than one firm (profile_firm_memberships, migration 0055) — shows a "Switch studio" link to the picker. */
  hasMultipleStudios?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const greeting = getGreeting(hour);
  // First name only in the always-visible trigger (2026-09-14, explicit
  // request: "use first name only, keep it casual") — the dropdown below
  // still shows the full `name` for a clearer identity confirmation once
  // opened.
  const firstName = getFirstName(name);

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret>
      <button
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          height: "100%",
          padding: "0 1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        {/* Role text removed from the always-visible trigger (2026-09-14,
            explicit request) — greeting + name only here; role still
            shows inside the opened dropdown below, which isn't visible
            header clutter. */}
        <span className="aorms-header-user-text cds--type-body-compact-01" style={{ textAlign: "right" }}>
          <strong>
            {greeting}, {firstName}
          </strong>
        </span>
        <span
          aria-hidden
          className="cds--type-label-01"
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            background: "var(--cds-background-selected)",
            color: "var(--cds-text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <strong>{initials}</strong>
        </span>
        <ChevronDown size={16} />
      </button>
      <PopoverContent>
        <div style={{ padding: "1rem", minWidth: "14rem" }}>
          <p className="cds--type-body-compact-02">
            <strong>{name}</strong>
          </p>
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
            {role}
          </p>
          <div
            style={{
              borderTop: "1px solid var(--cds-border-subtle)",
              paddingTop: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <Link href="/firm-settings" onClick={() => setOpen(false)} className="cds--type-body-01" style={{ color: "inherit" }}>
              Firm settings
            </Link>
            {hasMultipleStudios ? (
              <Link href="/select-studio" onClick={() => setOpen(false)} className="cds--type-body-01" style={{ color: "inherit" }}>
                Switch studio
              </Link>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="cds--type-body-01"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
