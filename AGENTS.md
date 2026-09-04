# AORMS (`esti`) — agent instructions

**Canonical agent guide:** [CLAUDE.md](CLAUDE.md) — edit that file only; do not
duplicate product law here.

**Roadmap:** [docs/esti/ROADMAP-CLOUD.md](docs/esti/ROADMAP-CLOUD.md) (what's
live) · [docs/esti/ROADMAP-LOCAL.md](docs/esti/ROADMAP-LOCAL.md) (engineering).

**Soft launch (aorms.in):** landing + blog only. Keep
`VITE_MARKETING_ONLY=true` on public builds until S8 (reopen `/login`).
AORMS is web-only — no desktop apps, no installers. Gate:
`frontend/src/lib/marketing-gate.ts`.

**UI:** IBM Carbon Design System (`@carbon/react`) — see CLAUDE.md § UI / design
system for the full migration status. Before UI work:
[`DESIGN-DEBT-REGISTER.md`](docs/hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md).
Legacy `@hcw/ui-kit` (MUI-based) coexists only until the Carbon migration's
Wave 6 decommission.

**AORMS AI:** ESTI runs through the backend AI gateway as part of the office
hub — see `docs/esti/PRODUCTION-OPS.md` § ESTI AI.

**Cursor rule (local):** `.cursor/` is gitignored — create rules locally if you
want always-on Cursor context; **repo law stays in CLAUDE.md**.
