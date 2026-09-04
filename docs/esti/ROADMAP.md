# AORMS Roadmap — index

**Status:** ACTIVE | Web-only office hub (no allied apps) | Stack migration to Next.js + Supabase planned  
**Updated:** 2026-09-04

This roadmap is split in two, by **branch and role**, not just environment —
see [`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split for the
full policy:

| Roadmap | Branch | Covers | Role |
| --- | --- | --- | --- |
| **[ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)** | `cloud-agent` → `main` | What's live on `aorms.in`; **primary feature development**, including the Next.js/Supabase stack migration ([spec](./NEXTJS-SUPABASE-MIGRATION.md)) | Where new work happens |
| **[ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)** | local checkout of `main` | Local dev/test loop — running the stack, typecheck/lint/test, verifying what cloud built | Where it gets tested |

They stay in sync at milestone boundaries: cloud-branch feature work (the
stack migration, new modules) is verified locally before/while it merges to
`main`.

---

## Quick links

- **Deploying / what's live now?** → [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)
- **Working on the codebase locally?** → [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Product definition?** → [AORMS-OFFICE-SYSTEM.md](./AORMS-OFFICE-SYSTEM.md)
- **Cleanup plan detail?** → [OFFICE-SYSTEM-CLEANUP-PLAN.md](./OFFICE-SYSTEM-CLEANUP-PLAN.md)

---

**Last updated:** 2026-09-04
