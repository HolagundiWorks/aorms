# Cloud-agent workflow — branching, do/don't, handoff

**Status:** ACTIVE (resumes the split paused earlier 2026-09-04 — see
[`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split)  
**Updated:** 2026-09-04  
**Audience:** cloud-agent sessions (hosted/cloud Claude Code sessions doing
primary feature development). If you're a cloud-agent session reading this:
this whole document is written for you — follow it exactly, don't summarize
past it.

---

## Why this exists

The previous round of this split ran one long-lived `cloud-agent` branch that
diverged from `main` for an extended period. When it finally merged, that
surfaced real problems that took a whole local session to untangle: the same
feature (blog removal, landing-page rework) had been independently built on
both `cloud-agent` and locally, in incompatible ways, discovered only at
merge time; a 72-error TypeScript pile-up that had never actually been
checked green on the branch itself. This document exists to stop that
happening again — the fix is **short-lived, narrowly-scoped branches, one
per task**, not one sprawling branch.

---

## Branch naming

One branch per task. Name it:

```
cloud-agent/<short-task-slug>
```

Examples: `cloud-agent/phase2-projects-tasks`, `cloud-agent/phase3-invoicing`,
`cloud-agent/fix-audit-log-rls`. Keep the slug specific enough that its scope
is obvious from the name alone. **Do not reuse the old bare `cloud-agent`
branch name** — that one already exists in history and merged once; a fresh
per-task branch avoids any ambiguity about what's on it.

---

## Workflow (every task, start to finish)

1. **Pull `main` first.** `git fetch origin && git checkout main && git pull`.
   Read [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) (what's live, what's in
   progress) and, if the task touches the Next.js/Supabase migration, the
   [migration spec](./NEXTJS-SUPABASE-MIGRATION.md) and the
   [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) — check whether the
   task is already partly done or claimed before starting.
2. **Branch:** `git checkout -b cloud-agent/<task-slug>` off the `main` you
   just pulled.
3. **Work the task, and only the task.** See § Do / Don't below.
4. **Self-verify before calling it done** — see § Self-verification checklist.
5. **Push the branch.** `git push -u origin cloud-agent/<task-slug>`. **Do
   not open a PR and do not merge to `main` yourself** — a local session
   verifies and merges (§ Handoff).
6. **Leave a clear handoff note** — either as the final commit message body
   or a short section you add to this doc / the relevant roadmap doc,
   covering: what was built, what was deliberately left out or deferred,
   what still needs verification that you couldn't do from a cloud session
   (e.g. anything needing a live database, a running local stack, or manual
   browser click-through), and any known issues.

---

## Do

- **Keep each branch to one task.** If you notice something else worth
  fixing while working, use the flag-for-later mechanism (a follow-up task
  suggestion) rather than bundling it into the current branch.
- **Match existing conventions**: commit messages end with
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`; code style
  matches the surrounding file (see `CLAUDE.md` § Conventions); pure Carbon
  for any UI (`CLAUDE.md` § UI / design system — no MUI, no custom
  components where Carbon has one).
- **Check for collision before touching a file** — `git log --oneline -5 --
  <file>` to see if it's had recent local-session activity; `CLAUDE.md` §
  Conventions already flags `frontend/src/routes/Projects.tsx` and
  `Clients.tsx` as having ongoing parallel WIP (avoid unless asked). The same
  caution applies more broadly now: if a file was touched in the last few
  days by a different actor, don't silently rework it — note the collision
  in your handoff instead of guessing who wins.
- **Update the roadmap doc's own tracking table** for the phase/item you
  worked on, on your branch, as part of the commit — but treat it as a draft
  the local-session merge may adjust, not the final word.
- **Write real tests** for new logic where the codebase already has test
  coverage for similar things (see existing `*.test.ts` patterns).
- **Ask the assigning session before starting** if a task's scope is
  ambiguous, rather than guessing broadly and building the wrong thing.

## Don't

- **Don't merge to `main`.** Ever, from a cloud-agent session. That's the
  local session's job, after verification (§ Handoff).
- **Don't force-push** a branch once pushed, and don't rewrite/amend commits
  that are already on the remote.
- **Don't let a branch outlive its task.** If the task turns out to be
  bigger than expected, stop, push what's done with a clear note about what
  remains, and let the next task pick up the rest on a fresh branch off the
  (by-then-updated) `main` — don't keep extending one branch for weeks.
- **Don't touch live infrastructure or secrets** — no deploy, no VPS access,
  no writing to a live Supabase project. `web/.env` is local-only and
  gitignored; don't expect it to exist, and don't hardcode credentials
  anywhere as a workaround.
- **Don't do sweeping, repo-wide changes as a side effect of a narrow task**
  (a global rename, a lint-config change, a dependency bump) unless that
  *is* the task — these are exactly the changes most likely to collide with
  parallel local work.
- **Don't mark a task "done" based only on your own read of the code** — run
  the actual checks (§ Self-verification). A branch that "should" typecheck
  but was never actually run through `tsc` is how the 72-error pile-up
  happened last time.

---

## Self-verification checklist (before pushing, every task)

Run whatever subset applies to what you touched:

- `pnpm --filter <affected-package> typecheck` (or `tsc --noEmit` in that
  package) — must be clean, not just "probably fine"
- `pnpm exec eslint <affected paths>` — must be clean
- `pnpm --filter <affected-package> test` — must pass
- `pnpm --filter <affected-package> build` (or `next build --webpack` for
  `web/`) — must succeed
- If you added/changed a Supabase migration under `web/supabase/migrations/`,
  you can't apply or test it live (no DB access from a cloud session) — say
  so explicitly in your handoff note rather than claiming it works.

---

## Handoff → local verification → merge

This is the local session's half of the loop, documented here so cloud-agent
knows what happens next and can write a handoff note that actually helps:

1. Local pulls the pushed `cloud-agent/<task-slug>` branch.
2. Local re-runs the full check suite (not just the affected subset) —
   `tsc`, `eslint`, tests, build, across every workspace package the branch
   touches or could have affected.
3. Where the task needs it, local does functional verification a cloud
   session can't: running the local Podman stack, applying/testing a
   Supabase migration against the real project, clicking through the actual
   UI in a browser.
4. Local merges to `main` (or sends the branch back with specific fix
   requests if verification fails) and pushes.
5. Local updates the roadmap doc's tracking table to its final state,
   reconciling anything the cloud-agent branch's own draft update didn't
   quite get right.

A cloud-agent branch is **not considered live or done until this happens** —
"pushed" is not "merged," and "merged" is not "deployed."

---

## Current assignment

See [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) § Stack migration for the active
Next.js/Supabase migration phase table — Phase 1 (Foundation) and the start
of Phase 2 (`profiles`/`clients`) are done on `main` already (built locally
this session). The natural next `cloud-agent` task is continuing Phase 2's
remaining domains per the landing order in
[NEXTJS-MIGRATION-PHASE2-AUDIT.md](./NEXTJS-MIGRATION-PHASE2-AUDIT.md)
(`project_offices`/`phases` UI + Server Actions, then `tasks`) — confirm
against the roadmap's current state before starting, since it may have moved
since this line was written.
