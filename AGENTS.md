# AORMS (`esti`) — agent instructions

**Canonical agent guide:** [CLAUDE.md](CLAUDE.md) — edit that file only; do not
duplicate product law here.

**Suite law:** [docs/esti/AORMS-SUITE.md](docs/esti/AORMS-SUITE.md) ·
[docs/esti/ROADMAP.md](docs/esti/ROADMAP.md) (S0–S7 ✅ · next S8) ·
[docs/esti/LOCAL-FIRST.md](docs/esti/LOCAL-FIRST.md).

**Soft launch (aorms.in):** landing + blog only. Keep
`VITE_MARKETING_ONLY=true` on public builds until S8. Installers stay Coming
soon until signed URL + sha256 (D6). Gate:
`frontend/src/lib/marketing-gate.ts`.

**UI:** `@hcw/ui-kit` v1.5.0 (HCW-UI-Kit, vendored from hcwux) on every surface —
see [`docs/hcw-kit/README.md`](docs/hcw-kit/README.md) and [`docs/HCW-UX.md`](docs/HCW-UX.md).
Before UI work: [`DESIGN-DEBT-REGISTER.md`](docs/hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) ·
[`HCW-KIT-AI-KNOWLEDGE-BASE.md`](docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) (R1–R9).
Re-vendor: [`docs/KITS.md`](docs/KITS.md). `@carbon/react` was removed (2026-07).

**AORMS AI:** `@hcw/aorms-ai-kit` — prompts + Ollama SDK in backend.

**Cursor rule (local):** `.cursor/` is gitignored — create
`.cursor/rules/aorms-suite-soft-launch.mdc` locally if you want always-on Cursor
context; **repo law stays in CLAUDE.md**.
