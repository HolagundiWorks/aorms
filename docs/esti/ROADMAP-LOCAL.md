# Moved — see [ROADMAP.md](./ROADMAP.md)

This file's content (the local-dev roadmap) was merged into
[`docs/esti/ROADMAP.md`](./ROADMAP.md) on 2026-09-10, along with the old
`ROADMAP.md` thin index and `ROADMAP-CLOUD.md`, into one single roadmap
document — explicit direction to stop maintaining three drifting files.

**What happened to this file's content:**
- The local Podman dev-loop instructions (`podman compose up -d
  --build`, local Postgres, local Supabase stacks) were cut outright,
  not carried forward — that entire workflow is retired: local Postgres
  was removed 2026-09-04, `backend`/`worker`'s Postgres/Drizzle
  dependencies were removed 2026-09-05 (they don't run locally anymore
  at all), and both `web/`'s and the Platform's local Supabase stacks +
  the Podman VM they ran in were removed entirely 2026-09-08. Keeping
  those instructions would have presented a dead workflow as current.
- The still-open, **status-uncertain** items (Carbon Design System
  migration Wave 3+, the old stack's Phase 4 config/backend cleanup)
  moved into `ROADMAP.md`'s own Open items section, honestly flagged as
  "last known state, not reverified" rather than asserted done or
  freshly stale.
- The already-completed "office system pivot cleanup" phase tracker
  (Phases 1–3, all ✅) was not carried forward — it documented work long
  finished with no remaining forward value.

This stub exists only so the several existing links to this exact path
(`docs/esti/ROADMAP-LOCAL.md`) keep resolving to something useful rather
than a dead file. If you're looking for anything this file used to
contain, it's in [`ROADMAP.md`](./ROADMAP.md) now.
