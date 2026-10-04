# AORMS `web/` — UI/UX & Branding Guide

**Status:** canonical for `web/` · **Rewritten:** 2026-10-01 (was the
"Branding & Shell Guide", 2026-09-14) · **Owner:** Human Centric Works

**Scope:** every surface of the live Next.js + Carbon stack in `web/`:
the **Office Hub** (`app/(app)/*`), the three **Platform portals**
(Identity, ConnectDeX, SysDeX — `app/(platform)/*`), the **Client**,
**Contractor** and **Collaborator** (third-party) portals, and the
**sign-in family**. One design language across all of them — see
[§ 13 Portal parity](#13-portal-parity).

**Authority.** This is the current UI/UX rulebook. It supersedes, for `web/`:
[`AORMS-BRANDING-KIT.md`](AORMS-BRANDING-KIT.md), [`HCW-UI-KIT.md`](HCW-UI-KIT.md),
[`HCW-UI-UX-PRINCIPLES.md`](HCW-UI-UX-PRINCIPLES.md) and
[`UI-SITE-MAP.md`](UI-SITE-MAP.md) — all describe the retired `@hcw/ui-kit` /
MUI frontend and are kept for history only. Governance (what is and isn't
allowed on top of Carbon) lives in `CLAUDE.md` § UI; this guide is the *how*.
Navigation structure lives in [`NAVIGATION.md`](NAVIGATION.md) and, as code, in
`web/lib/shell/nav-data.ts`.

---

## 1. Design language in one paragraph

> **Carbon underneath, an architectural operating system on top.**
> Carbon supplies the rules, components, accessibility and grid. AORMS adds the
> visual language of an architect's drawing set: **white and black are structure,
> thin 1px rules replace grey slabs, large light numerals carry the data,
> monospaced type carries identifiers, and one accent — Radiant Orange — means
> "this is active".** Pages are *sheets*: numbered, titled, with a stated
> outcome, and a quiet reference in the corner.

Internal name of the language: **"Architectural Operating System"**. It is a
*design-language* name only. The public tagline stays **"Architecture Practice
Operating System"** (live in title/OG/Twitter/hero; do not rename without an SEO
check).

### The formula

| Layer | Provides |
|---|---|
| Carbon v11 (`@carbon/react`) | components, accessibility, keyboard behaviour, grid, tokens |
| Sheet system | numbering, sheet marks, "The result", floating footer |
| Presentation components | `BigStat`, `PlanGlyph`, `PhaseStrip`, `ProjectCard`, `ProjectsBrowser`, `HubSheet`, rail layout, schedule tables |
| Motion (`motion` package) | restrained entrance/transition only, via shared tokens |

**Not allowed** (unchanged governance): MUI, neumorphism/glass/soft surfaces,
bespoke replacements for a Carbon component that already exists, a second brand
hue, raw hex colours in components (use the tokens in § 3).

---

## 2. Product identity hierarchy

```
AORMS                          — the master brand (one product)
├── Office Hub                 — the firm-facing app (aorms.in)
├── Identity Portal            — architects & Studios (identity.aorms.in)
├── ConnectDeX Portal          — material/interior suppliers (connectdex.aorms.in)
├── SysDeX                     — platform staff admin (sysdex.aorms.in)
├── Client Portal              — a studio's clients (/portal)
├── Contractor Portal          — invited contractors, sealed bids (/contractor-portal)
└── Collaborator Portal        — external consultants (/collab-portal)
```

All are **sub-brands of AORMS**, not separate products — underlying
tenancy/audience split in
[`AORMS-PLATFORM-ARCHITECTURE.md`](AORMS-PLATFORM-ARCHITECTURE.md) § Three portals.

**"AORMS Office Hub" is never displayed as a single unit.** A signed-in user's
primary identity is the organisation they are in (the firm's own name) or the
portal's own name — never a compound "AORMS <workspace>" string. The AORMS mark
lives in the corner watermark only (§ 6.4).

---

## 3. Tokens

All defined once in `web/app/globals.scss` (`:root`). Use the variable, never the
literal.

### 3.1 Colour

| Token | Value | Role |
|---|---|---|
| `--aorms-ink` | `#161616` | structure: heavy rules, primary buttons, display numerals |
| `--aorms-rule` | `#c6c6c6` | hairlines: row dividers, card borders, section rules |
| `--aorms-orange` | `#FF4F18` | **activity only** (see 3.2) |
| `--aorms-orange-wash` | `rgba(255,79,24,.12)` | hover/selected/drop-target wash |
| `--cds-*` | Carbon white theme | everything else (text, layers, status: success/warning/error) |

Buttons: **primary and tertiary are ink** (`--cds-button-primary`/`-tertiary`
overridden to `#161616`), not Carbon blue and not orange. Links stay Carbon's
link colour. Focus rings stay Carbon blue (accessibility, not brand).

### 3.2 The orange rule — "black/white = structure, orange = activity"

Orange marks *where you are or what is live*. Permitted uses, exhaustively:

- the **active side-nav item** (bar + wash) and the Instructions toggle when on
- the **selected tab** underline
- **progress fills** (progress lines, Carbon `ProgressBar`)
- the **"Active"** project status label and live-work counts (`BigStat active`)
- the **"The result"** label
- **pinned** state, **selected/active** person chip, **drop targets** (wash)
- hover wash on table rows (the 12% wash)

Never: body text, links, decorative fills, backgrounds, every button, charts'
series colour, status meaning (use Carbon status tokens for success/warning/error).

### 3.3 Typography

- **IBM Plex Sans** (Carbon default) for everything; **IBM Plex Mono** for
  identifiers (`TASK-0184`, `AORMS-04.03`, project refs), numeric schedule
  columns, dates in footers.
- Display numerals and big headings are **light (300)**: `BigStat` 3rem,
  rail tiles 1.75rem, page summary 1rem.
- Labels are **uppercase, 0.6875rem, weight 600, tracking .06–.1em**
  (`.aorms-bigstat__label` is the canonical label style).
- Always `font-variant-numeric: tabular-nums` on numbers.

### 3.4 Lines & geometry

Square corners (tags are squared). Elevation is flat: a **1px `--aorms-rule`**
border or a **1–2px `--aorms-ink`** rule — never a shadow, except the hover-
expanded rail's edge. Heavy rule (2px ink) = a section/table head; hairline
(1px rule) = a row/field divider.

### 3.5 Motion

Only through `lib/motion/tokens.ts` (`standardTransition`, distances, stagger),
always inside `MotionConfig reducedMotion="user"` (`MotionRoot`). Used for:
card-grid stagger (`MotionStagger`), project-tab slide (`PanelSlide`). CSS
transitions ≤ 240ms for hover (veil fade, image scale) and **must** be disabled
under `prefers-reduced-motion`. No decorative or looping animation.

---

## 4. The sheet system

Every page is a **sheet** in a drawing set.

### 4.1 Numbering (`lib/shell/nav-data.ts` — the single source)

Numbers are **positional** (computed from nav order, never stored). Reordering the
nav renumbers the set.

| Surface | Scheme | Example |
|---|---|---|
| Office Hub | top-level `00`–`03` (Pulse = `00`, the hub), groups `04`–`12`, pages `GG.NN` | `AORMS-04.03` = Site › Progress Reports |
| Identity / ConnectDeX / SysDeX | portal code + page index | `AORMS-ID-02`, `AORMS-CX-01`, `AORMS-SX-05` |
| Client / Contractor / Collaborator | `CL` / `CT` / `CB` | `AORMS-CL-01` |
| Sign-in family | `00`, `00.01`, `00.02`… | `AORMS-00` = Sign in |

`sheetFor(pathname)` resolves a URL by longest matching href; a route not in the
nav has no sheet (no mark, no footer).

### 4.2 The four sheet elements

1. **Sheet mark** (`SheetMark`) — `AORMS-04.03 / SITE / PROGRESS REPORTS` in mono
   caps over a 1px ink rule, above every page title. Automatic inside
   `PageHeader` / `AuthHead`.
2. **"The result"** (`PageHeader result=…` / `AuthHead result=…`) — one
   **outcome-first** line, orange label, e.g. *A coordinated project record.*
   Write what the sheet leaves you with, not what it is. Never a sentence about
   the UI.
3. **Floating sheet footer** (`TitleBlock.tsx`) — one faint line fixed beside the
   AORMS mark: `OFFICE / SECTION / PAGE / SHEET / DATE`, **50% opacity**,
   non-interactive, hidden in print; below `42rem` only `SHEET / DATE`.
   *Every field must be real* (office from the session or portal name, sheet from
   the nav, date = today IST filled in after mount). **Do not add Revision or
   Status** — the app has no such data for a page; decoration presented as data
   is forbidden.
4. **AORMS mark** (`BrandWatermark`) — fixed bottom-right, 16px, 35% opacity.

### 4.3 Page anatomy (top to bottom)

```
SHEET MARK            AORMS-04.03 / SITE / PROGRESS REPORTS   ── 1px ink rule
Title                 + actions (right)
Description           how-to note — only on pages with no rail (otherwise it is the rail's Brief)
THE RESULT  …         outcome line (instruction)
─────────────────
[ KPI rail | page body ]        ← § 7
  rail = KPIs, then the BRIEF   (the screen's description / Pulse's live daily brief)
```

---

## 5. Instructions toggle

"How to use" text is *optional chrome*. A single preference hides all of it.

- **Mark** every how-to note with `.aorms-instruction`. Built in:
  `PageHeader` description and result, `ContextPanel` description, `AuthHead`
  description and result, drag-and-drop hints, empty-state "Drop a task here".
- **Hide** with `[data-instructions="off"] .aorms-instruction { display:none }`.
- **Default is ON.** Stored in cookie `aorms_instructions` (`on`/`off`), read
  server-side so first paint is correct and the choice follows the person across
  the Hub and every portal on the domain.
- **Where the control is:** Office Hub — last entry of the side panel
  (`Instructions · On/Off`); portals — an info icon in the header
  (`InstructionsToggle`); surfaces wrap in `InstructionsScope`
  (`data-instructions`).
- **Classification rule.** *Instruction* = tells you how to use the screen →
  `.aorms-instruction`. *Data/status* = anything computed (Pulse's brief, counts,
  alerts) → **never** an instruction (`PageHeader summary`, not `description`).
  Errors, warnings, validation messages and empty-state *facts* ("No tasks match
  the filters") are never hidden.

---

## 6. Shell

### 6.1 Office Hub (`AppShell.tsx`)

- **Header:** firm name (`OrganisationIdentity`) leading; trailing: Ask ESTI,
  Wellbeing, Calculator, Pomodoro, greeting + avatar menu. No logo.
- **Side nav:** a permanent **48px icon rail**; hover or keyboard focus expands it
  to 256px **as an overlay** (the page never reflows — content margin is pinned to
  3rem). **No toggle/close button on desktop.** Below `lg` (66rem) it is an
  off-canvas overlay opened by a header hamburger, closed by backdrop or link.
  Entries show their sheet number in mono. The last entry is the Instructions
  toggle.
- **Nav groups** run from daily work outward (Site, Estimation & Tech → Third
  Parties, Tender Management, Office, Accounts → HR → Knowledge Bank → Admin).
  A group and its own child never share a name.

### 6.2 Platform portals (`PlatformShellHeader.tsx`)

Same Carbon header anatomy: portal name leading + tagline, flat
`HeaderNavigation`, trailing Instructions toggle, greeting, avatar, Sign out.
Flat top nav (not a rail) because each portal has 3–11 links; consistency is at
the component level.

### 6.3 Client / Contractor / Collaborator portals

A minimal Carbon `Header` + `Content` (no side nav — a flat list needs none):
name-only `PortalHeaderName` (no logo in the header, matching the Hub),
Instructions toggle, Sign out.

### 6.4 Corner furniture (all surfaces)

Floating sheet footer + AORMS mark, bottom-right. Present in the Hub, every
portal layout, the sign-in layout and the studio picker.

---

## 7. Layout: the Pulse rail

**Rule:** a page with a KPI row uses the **Pulse layout** — header across the top,
KPIs as a **left rail of large numerals**, the page body beside it.

- **Mechanism (pure CSS):** put `className="aorms-rail-kpis"` on the KPI row
  `<div>` that is a **direct child** of the page column (next to `PageHeader`).
  `div:has(> .aorms-rail-kpis)` becomes a two-column grid (11rem rail, rest);
  the first KPI row only becomes the rail; tiles are restyled as large numerals
  with a 1px ink rule on top (status stripe and trend row kept).
- **Fallbacks:** a row nested deeper keeps its normal tile grid. Below `lg` the
  rail becomes a wrapping row above the page.
- **Applied to** 45 Office Hub list/detail pages (including **Projects**, whose
  BigStat row is now the rail) plus the SysDeX dashboard. Pulse builds its rail with
  `BigStat`. The old "Active projects" board on Pulse was removed (2026-10-01) — the
  Projects screen is where projects live.
- **The Brief (2026-10-01).** Directly below the KPIs the rail carries the screen's
  **Brief** (`RailBrief`): the page's description, moved out of the header. CSS hides
  the header copy only when the rail is active (`div:has(> .aorms-rail-kpis >
  .aorms-rail-brief) > :first-child .aorms-page-desc`), so a page whose KPI row can't
  become a rail keeps its description under the title. The brief is an instruction
  (`.aorms-instruction`) and obeys the toggle. **Pulse's brief is live, not boilerplate:**
  *Today's brief* (`PulseBrief`, `briefSentence()`) sits under the Pulse numerals and is
  *not* an instruction. 42 pages carry a `RailBrief`; pages with a JSX description
  (Consultants, Contractors, project Decisions, project Overview) keep it in the header.
- **Revert** by deleting the `/* Pulse layout on every screen */` and `Rail brief` CSS blocks.
- **When there is no KPI row**, do not invent one; the page is a plain sheet.
- Content width is `calc(100% - 3rem)` beside the rail; never set widths on the
  page column.

### KPI components

| Component | Use |
|---|---|
| `KpiTile` | dense pages: 9rem × 5.5rem tile, value + label (+ icon, status stripe, trend). In a rail it renders as a large numeral. |
| `BigStat` | hero numerals (3rem, light) — Pulse rail, Projects strip. `active` tints orange (live work only). |

---

## 8. Tables: technical schedules

Applied globally to every Carbon `DataTable` in `globals.scss`: transparent
header/body, **2px ink rule under the header**, uppercase 0.6875rem headers,
**1px rule between rows**, tabular numerals, orange 12% wash on row hover.

- **Numeric/money columns:** `className="aorms-num"` on both `TableHeader` and
  `TableCell` → right-aligned, IBM Plex Mono. Money is always integer paise
  formatted with `formatInr`.
- Identifiers (`ref`) in mono (`.aorms-project-card__ref`).
- Keep columns few and meaningful; status as a squared `Tag`.

---

## 9. Page templates

| Template | Anatomy | Examples |
|---|---|---|
| **List** | sheet mark → title+actions → (summary) → description → result → **rail + table** | Invoices, Tenders, Snags |
| **Board** | filters → status row → people strip → columns | Tasks |
| **Hub** | "00 / The office" sheet (3 ruled columns) + rail | Pulse |
| **Cover sheet** | cover facts → phase strip → plan/image + facts → module links | Project Overview |
| **Browser** | view switch (Cards/Lines) → grouped grid/table | Projects |
| **Auth** | `AuthHead` → form → (login: title-block strip) in one centred 30rem column | Sign in, Sign up, Reset, Choose studio |

---

## 10. Component rules

### 10.0 The list toolbar — one control bar everywhere (2026-10-01)

**Rule:** search, filters, sort and the view switch live in **one component**,
`ListToolbar`, in a **fixed order** — `[ search ………… ] [ filters ] [ sort ] [ view ]`
— followed by a status line (`Showing X of Y`, quick actions such as *My tasks*, and
*Reset* when anything is on). Every list screen uses it; do not build a bespoke
filter row.

| Screen | Search | Filters | Sort | View switch |
|---|---|---|---|---|
| Projects (`ProjectsBrowser`) | title, ref, client, city, type | Status, Type | Newest · Name · Reference · Status · Task progress (pinned always on top) | Cards / Lines |
| Tasks (`TaskBoard`) | title, project, `TASK-0184` | Project, Person, Priority, Due date (+ custom range) | Priority · Due · Effort · Recent · Title | Board / Calendar |
| **Every table screen** (`TableToolbar`, 47 pages) | any cell | Status (when the table has a Status column) | any column ↑/↓ (text, ₹/numbers and dates compared properly) | — |

- `ListToolbar` is presentational and controlled: the screen owns state and data.
- `TableToolbar` is for server-rendered tables: place it **immediately before** a
  Carbon `<Table>` (wrap both in a fragment). It reads the table from the DOM,
  filters by toggling each row's `display`, and sorts by re-appending the same row
  nodes inside `<tbody>` (no nodes created/destroyed, so React's later updates still
  work). Whole-table "empty state" rows are never touched. Action columns (PDF,
  Actions…) are excluded from sort.
- A view switch appears only where the screen genuinely has two views.
- Preferences that should persist (the Projects view) go in a cookie read on the
  server; filters/sort that define a *view* go in the URL (Tasks) — see § 11.

### 10.1 Hub sheet & daily brief (Pulse)

- **Brief** (`PulseBrief`, `briefSentence()`): a live one-sentence summary in the
  **rail, below the numerals** (was under the title until 2026-10-01). Only non-zero parts, most urgent
  first: overdue → due today → meetings → decisions waiting on the client →
  approvals awaiting → blocked → open snags; "nothing is due or waiting" when
  empty. Not an instruction, so the Instructions toggle never hides it (`PageHeader
  summary` remains available for other live data lines).
- **Hub** (`HubSheet`): *Projects* (counts by status) · *Today* (IST date; counts
  linking to filtered views; today's meetings with project ref) · *Attention* (≤6
  rows `ref · title · reason`, each a link to the view that resolves it).
- Both read one shared, request-cached query set (`lib/pulse/hub-data.ts`
  `getHubData()`); nothing estimated; RLS-scoped.

### 10.2 Projects browser (`ProjectsBrowser`)

- **Cards (default):** 4:3 image cards, auto-fill grid (min 17rem). **Hover or
  keyboard focus fades in** a dark gradient with the project **name**,
  client·city and task progress. The name is always in the DOM (opacity only) for
  screen readers; on touch (`hover:none`) it is permanently visible. No cover
  image → generated `PlanGlyph` (footprint, structural grid, dimension strings
  from real area/floors; "NO SCALE DATA" when empty). Caption under the card:
  mono ref + status.
- **Lines:** schedule table with thumbnail, ref, project, client, type, city,
  tasks done/total, status.
- **Switch + memory:** `ContentSwitcher` Cards/Lines; choice in cookie
  `aorms_projects_view` read server-side (`?view=cards|lines` overrides;
  `?view=schedule` = lines).
- **Pins are personal** (table `project_pins`, own-rows RLS). Pinned form a
  "Pinned" group above "All projects" (cards) / sort first (lines). Optimistic;
  reverts with an inline error if the server refuses. Pin buttons are
  `aria-pressed`, labelled with the project name, and sit *beside* the card link
  (never nested interactive elements).
- **Cover images:** uploaded from the project Overview (write-tier only);
  private bucket, validated (type, magic bytes, ≤5MB), signed URLs.

### 10.3 Tasks board (`TaskBoard`)

- **Filters** (all client-side, mirrored in the URL, only non-defaults written):
  `q` text/ID, `project`, `assignee` (Me / Unassigned / person), `priority`,
  `date` (`overdue|today|week|month|none|range` + `from`,`to`), `sort`
  (`priority|due|hours|recent|title`; stable, undated last). Overload alerts and
  load bars always use the **full** list, never the filtered one.
- **Order:** slim **Attention line** (one line for overdue / short deadlines /
  overloaded people) → filter row → status row (Board/Calendar switch, "Showing X
  of Y", My tasks, Reset) → **people strip** → columns.
- **People strip:** a chip per person — avatar, "N open · Xh", 2px load line (red +
  "overloaded" when over capacity). **Drag a person onto a card to assign**,
  click to filter (orange outline), Enter/Space too; a dashed **Unassigned** chip
  clears the assignee.
- **Columns** (To do / In progress incl. blocked / Completed): ruled head with
  two-digit count + total hours; each column **scrolls on its own**. Drop a card
  on a column to move it.
- **Card:** mono `TASK-0184` + priority label + "Move to…" menu · title · project
  (· floor) · flag tags *only when something is wrong* (Blocked, At risk, Overdue,
  Waiting on prerequisite) · footer: due date (red when overdue), hours, assignee
  avatar. Priority is the left border (critical = red, high = ink).
- **Calendar:** month grid; drag a task onto a day to set its deadline; "No
  deadline" tray.
- **Drag-and-drop is never the only way:** the card menu moves status; keyboard
  operates person chips; failures revert and say why.

### 10.4 Calculator

Header popover; unit-aware (m, cm, mm, ′ ″ ft in, m² m³ ft² ft³). Rules:
length×length=area, area×length=volume, same-dimension add/subtract, unary minus,
`%` is a percentage *of the other operand* after +/−. Alt+C toggles, Esc closes,
Enter reuses the result.

### 10.5 Sign-in family (`AuthHead`)

Centred 30rem column, sheet mark, logo, **light** heading, instruction
description, "The result", form, and (login only) a three-cell title-block strip
(System · Access · Session). Behaviour (Google, Turnstile, credential prompt,
Server Actions) is never altered by styling.

---

## 11. Interaction & accessibility rules

1. **Keyboard parity.** Every drag interaction has a keyboard/menu equivalent.
2. **Hover is enhancement.** Anything revealed on hover is also revealed on
   `:focus-visible` and is always present for assistive tech / touch.
3. **Optimistic UI must revert** and surface the reason (`InlineNotification`).
4. **Preferences are cookies read on the server** (view, instructions) — no flash,
   follows the person. URL params carry *view state* (filters, sort, view) so
   views are bookmarkable and survive reload; they must validate untrusted input.
5. **Reduced motion** disables fades/zooms/slides.
6. **Contrast:** secondary text uses `--cds-text-secondary`; the 50%-opacity
   footer and 35% mark are decorative and `aria-hidden`/non-essential.
7. **Responsive:** every layout is checked at 1440px and 390px with no horizontal
   scroll; rail → row, columns → stack, footer → sheet + date.
8. **No fabricated data in chrome** (title block rule, § 4.2).
9. **Mobile nav closes** after link or backdrop; no close button on desktop.
10. **Errors are plain**: mapped via `toSafeErrorMessage`, never raw database text.

---

## 12. Do / Don't checklist for a new screen

**Do**
- Use `PageHeader` (gets the sheet mark and instruction handling for free) with a
  `result` line; use `summary` only for live data.
- Put KPIs in a direct-child row marked `.aorms-rail-kpis`, and the screen's brief in it as a `RailBrief`.
- Put search/filter/sort/view in `ListToolbar` (or `TableToolbar` before a table) — never a custom row.
- Use stock Carbon for forms, modals, tabs, tables, notifications.
- Mark how-to text `.aorms-instruction`; keep facts and errors unmarked.
- Use `aorms-num` on money/quantity columns; mono for identifiers.
- Add the page to `nav-data.ts` (Hub) or the right portal list so it gets a sheet.
- Check at 1440px and 390px; check keyboard path for any drag.

**Don't**
- Don't use orange for anything outside § 3.2, or add another accent.
- Don't add boxes, shadows or grey slabs where a 1px rule works.
- Don't put a logo in a header or a title block at the page foot.
- Don't hide errors or data behind the Instructions toggle.
- Don't invent Revision/Status or any metadata the app doesn't have.
- Don't set widths on the content column or reintroduce a desktop nav toggle.
- Don't build a bespoke component where Carbon has one.
- Don't scatter search, filter, sort or view controls in different places per screen.

---

## 13. Portal parity

The same rules apply to every surface. What is **shared** (identical) vs what
**legitimately differs**:

| Concern | Office Hub | Identity / ConnectDeX / SysDeX | Client / Contractor / Collaborator | Sign-in family |
|---|---|---|---|---|
| Sheet mark above titles | ✓ (`AORMS-04.03`) | ✓ (`AORMS-ID-02`…) | ✓ (`AORMS-CL-01`…) | ✓ (`AORMS-00…`) |
| "The result" lines | ✓ | ✓ | ✓ | ✓ |
| Floating sheet footer + AORMS mark | ✓ | ✓ | ✓ | ✓ |
| Instructions toggle | side panel | header icon | header icon | (no header; honours the cookie) |
| Header | firm name + actions | portal name + tagline + flat nav | portal name only | none (logo in `AuthHead`) |
| Navigation | icon rail (hover) | flat top nav | none | none |
| Tokens, tables, buttons, type | identical (global CSS) | identical | identical | identical |
| Rail layout for KPIs + Brief | ✓ (45 pages) | SysDeX dashboard (rail; no brief yet) | — (no KPI rows) | — |
| List toolbar (search/filter/sort/view) | ✓ (Projects, Tasks, 47 table screens) | — (tables not yet wrapped) | — | — |
| Layout width | content beside rail | Carbon grid, 4.5rem top clearance for the sheet mark | Carbon `Content` | centred 30rem |

Portal sheet codes live in `PORTALS` (`nav-data.ts`); add a page there to give it
a sheet.

---

## 14. Implementation index

| Area | Files |
|---|---|
| Tokens, tables, rail, sheet, tasks, projects CSS | `web/app/globals.scss` |
| Navigation + sheet numbering | `web/lib/shell/nav-data.ts`, `lib/shell/preferences.ts` |
| Shell | `components/aorms/AppShell.tsx`, `PortalHeaderName.tsx`, `platform/PlatformShellHeader.tsx`, `BrandWatermark.tsx` |
| Sheet elements | `SheetMark.tsx`, `TitleBlock.tsx` (floating footer), `PageHeader.tsx`, `AuthHead.tsx` |
| Instructions | `InstructionsScope.tsx`, `InstructionsToggle.tsx`, `InstructionsToggleButton.tsx` |
| KPIs & rail brief | `KpiTile.tsx`, `BigStat.tsx`, `RailBrief.tsx` |
| List toolbar | `ListToolbar.tsx`, `TableToolbar.tsx` |
| Projects | `ProjectsBrowser.tsx`, `ProjectCard.tsx`, `PlanGlyph.tsx`, `PhaseStrip.tsx`, `CoverImageControl.tsx`, `lib/projects/covers.ts`, `lib/actions/project-covers.ts` |
| Tasks | `tasks/TaskBoard.tsx`, `tasks/LibraryManager.tsx`, `tasks/GenerateTasksPanel.tsx`, `lib/tasks/{filter,workload,estimate,dates,ref,starter-library}.ts` |
| Pulse | `pulse/HubSheet.tsx`, `pulse/PulseBrief.tsx`, `lib/pulse/hub-data.ts` |
| Calculator | `calculator/HeaderCalculator.tsx`, `lib/calc/dimensional-calc.ts` |
| Motion | `motion/{MotionRoot,MotionStagger,MotionReveal,MotionEnter,PanelSlide}.tsx`, `lib/motion/tokens.ts` |

---

## 15. Change log

- **2026-10-04 (landing: scroll between sections, no clock)** — the live clock is removed (nameplate and
  phone bar). The mouse wheel / trackpad now moves between landing boards: a board taller than the screen
  scrolls first, and only a *fresh* gesture at its top/bottom edge advances (700ms cooldown; momentum from a
  scroll that was still moving the board never carries over). Arrow keys, rail and `#hash` still work; touch
  scrolling is native.
- **2026-10-04 (landing v2: seven boards)** — the landing page is cut from 16 boards to 7 (copy in
  `lib/marketing-spine.ts`): 01 Start · 02 The Project (spine + DNA) · 03 The Office · 04 The Workflow ·
  05 The Memory (Knowledge + ESTI) · 06 The System (data, cost calculator, pricing strip, demo) · 07 Enter
  AORMS (CTA, blog, FAQ). Numbers read "NN / 07"; the nameplate and phone bar carry a live IST clock
  (HH:MM:SS, client-only). All earlier `#hash` anchors alias to the new boards. The 16-board entry below
  is superseded.
- **2026-10-04 (landing content: project spine)** — landing boards re-ordered around one project spine
  (copy in `lib/marketing-spine.ts`): 00 Start · 01 Problem · 02 Spine · 03 Office mapped · 04 Project
  page · 05 Project DNA · 06 Site · 07 Tender · 08 Accounts · 09 Knowledge · 10 ESTI · 11 Your data ·
  12 Cost · 13 Pricing · 14 Demo · 15 Start. Layout unchanged. Old `#fee-recovery`, `#revision-management`,
  `#project-record`, `#pulse` hashes alias to the new boards. Not claimed: local/on-prem install, tender
  negotiation step, attendance-aware ESTI answers.
- **2026-10-04 (public content pages)** — blog, ConnectDeX Partners and legal pages now share
  `components/aorms/PublicShell.tsx`: logo + mono link row (Partners · Blog · Privacy · Terms · Sign in)
  and the right-hand sheet nameplate (00 landing · P-01 · B-01/B-02 · L-01/L-02, prev/next). Eyebrows use
  `.aorms-lp-eyebrow`, blog links are ink with a rule, partner-card eyebrows use `--aorms-orange-text`.
  The nameplate sits flush to the top on header-less pages.
- **2026-10-04 (nameplate on every portal)** — `components/aorms/SheetNameplate.tsx` brings the Office Hub's
  right-hand sheet nameplate to Identity, ConnectDeX, SysDeX and the Client / Contractor / Collaborator
  portals (portal name bar · mono sheet number · title · prev/next within the portal · signed-in name).
  Wired in the `(platform)`, `(portal)`, `(collab-portal)`, `(contractor-portal)` layouts; sign-in sheets
  (`00…`) get none. The ≥ 90rem layout shifts are now scoped with `body:has(.aorms-np)`, so shells without
  a nameplate aren't shifted. Corner drawing remains Office-Hub-only.
- **2026-10-02 (landing redesign, current hcworks.in)** — the public landing page
  (`app/page.tsx`) follows the *current* hcworks.in (re-checked against the live site, not the
  older accordion-strip layout): one full-viewport sheet at a time — write-up on the left, "The
  result" plus a generated plan drawing (corner figure) on the right — with a fixed **right-hand
  nameplate** on desktop (black CTA bar · big mono number · title · prev/next arrows · board
  index · studio/contact block + footer links). Phones/tablets: black title bar (number | title |
  mark) and a right-hand **number rail**. `components/aorms/landing/Artboards.tsx`; arrow keys,
  Home/End and `#hash` links open boards (no scroll-wheel hijacking). Boards 00–10: Start ·
  Problem · Pulse · Fees & Revisions · Project Record · Automation & ESTI · What it costs you ·
  Your Data · Pricing · See it · Start. All boards are server-rendered (closed ones
  `display:none` + `inert`). Copy reuses `marketing-content.ts`; orange only marks the active
  board's number in the index.
