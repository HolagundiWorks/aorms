import { HOURS_PER_DAY, addDays, addWorkdays } from "./dates";

/**
 * Task-library timeline model. A library entry is a *formula*, not a fixed
 * duration, so the same "Working drawing — floor plan" entry gives 3 days
 * for a 120 m² floor and 9 days for a 900 m² floor:
 *
 *   hours = clamp( (base_hours + hours_per_100sqm × area / 100) × complexity, min_hours, max_hours )
 *
 * `area` is chosen by the entry's `area_basis`: the floor's own area
 * (PER_FLOOR entries), the project's total built-up area, its site area,
 * or nothing (fixed-effort entries such as "Client presentation").
 */
export type TemplateScope = "PROJECT" | "PER_FLOOR";
export type AreaBasis = "FLOOR" | "BUILT_UP" | "SITE" | "NONE";

export type TaskTemplate = {
  id: string;
  code: string;
  title: string;
  bundle: string;
  scope: TemplateScope;
  area_basis: AreaBasis;
  base_hours: number;
  hours_per_100sqm: number;
  min_hours: number | null;
  max_hours: number | null;
  work_type: string | null;
  classification: string | null;
  difficulty_coefficient: number;
  active?: boolean;
  sequence: number;
  /** Code of the library entry this one runs after (null = no prerequisite). */
  depends_on_code?: string | null;
};

export type ProjectScale = {
  builtUpAreaSqm: number;
  siteAreaSqm: number;
  floors: { label: string; areaSqm: number }[];
};

/** Scale band of a project by built-up area — shown next to the estimate so users see *why* durations are what they are. */
export function scaleBand(builtUpSqm: number): "Small" | "Medium" | "Large" | "Major" {
  if (builtUpSqm < 150) return "Small";
  if (builtUpSqm < 600) return "Medium";
  if (builtUpSqm < 2500) return "Large";
  return "Major";
}

export function areaFor(t: Pick<TaskTemplate, "area_basis">, scale: ProjectScale, floorAreaSqm?: number): number {
  switch (t.area_basis) {
    case "FLOOR":
      return floorAreaSqm ?? 0;
    case "BUILT_UP":
      return scale.builtUpAreaSqm;
    case "SITE":
      return scale.siteAreaSqm;
    default:
      return 0;
  }
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;

export function estimateHours(
  t: Pick<TaskTemplate, "base_hours" | "hours_per_100sqm" | "min_hours" | "max_hours">,
  areaSqm: number,
  complexity = 1,
): number {
  let h = (t.base_hours + (t.hours_per_100sqm * Math.max(0, areaSqm)) / 100) * complexity;
  if (t.min_hours != null) h = Math.max(h, t.min_hours);
  if (t.max_hours != null) h = Math.min(h, t.max_hours);
  return roundHalf(Math.max(0.5, h));
}

export type PlannedTask = {
  /** Stable key within this plan (`templateId` or `templateId:floorLabel`) — lets the caller map dependencies to real row ids. */
  key: string;
  /** Key of the planned task this one must wait for, or null. */
  dependsOnKey: string | null;
  dependsOnTitle: string | null;
  templateId: string;
  title: string;
  floorLabel: string | null;
  areaSqm: number | null;
  estimatedHours: number;
  startDate: string;
  dueDate: string;
  workType: string | null;
  classification: string | null;
  difficulty: number;
};

/**
 * Expands chosen library entries against a project's scale into concrete,
 * *sequenced* tasks: one per entry for PROJECT scope, one per floor for
 * PER_FLOOR scope, each with hours from the formula.
 *
 * An entry may "run after" another entry (`depends_on_code`). When that
 * prerequisite is also selected, each task waits for it:
 *   - per-floor after per-floor  → the same floor's task (floor 2's electrical
 *     layout follows floor 2's plan, not floor 3's);
 *   - project-wide after per-floor → the LAST floor to finish (sections can't
 *     start until every floor plan is done);
 *   - anything after a project-wide task → that one task.
 * A dependent task starts on the next working day after its prerequisite's
 * due date; everything else starts on `startISO`. Due = start + working days
 * of effort. A prerequisite that isn't selected is ignored (no dangling
 * dependency), and a cycle is broken by planning the remaining entries
 * without dependencies rather than looping.
 */
export function planTasks(
  templates: TaskTemplate[],
  scale: ProjectScale,
  startISO: string,
  complexity = 1,
): PlannedTask[] {
  const out: PlannedTask[] = [];
  const byTemplate = new Map<string, PlannedTask[]>(); // template code -> its planned tasks
  const selectedCodes = new Set(templates.map((t) => t.code));
  let pending = [...templates].sort((a, b) => a.sequence - b.sequence || a.title.localeCompare(b.title));

  while (pending.length) {
    const ready = pending.filter((t) => !t.depends_on_code || !selectedCodes.has(t.depends_on_code) || byTemplate.has(t.depends_on_code));
    const batch = ready.length ? ready : pending; // cycle guard: plan the rest without deps
    const cyclic = ready.length === 0;
    for (const t of batch) {
      const prereqs = !cyclic && t.depends_on_code ? byTemplate.get(t.depends_on_code) ?? [] : [];
      const targets =
        t.scope === "PER_FLOOR"
          ? scale.floors.map((f) => ({ label: f.label as string | null, area: f.areaSqm }))
          : [{ label: null as string | null, area: areaFor(t, scale) }];
      const planned: PlannedTask[] = [];
      for (const target of targets) {
        const area = t.scope === "PER_FLOOR" ? areaFor(t, scale, target.area) : target.area;
        const hours = estimateHours(t, area, complexity);
        const prereq = pickPrerequisite(prereqs, target.label);
        const start = prereq ? addWorkdays(addDays(prereq.dueDate, 1), 1) : startISO;
        planned.push({
          key: target.label ? `${t.id}:${target.label}` : t.id,
          dependsOnKey: prereq?.key ?? null,
          dependsOnTitle: prereq?.title ?? null,
          templateId: t.id,
          title: target.label ? `${t.title} — ${target.label}` : t.title,
          floorLabel: target.label,
          areaSqm: area > 0 ? Math.round(area * 10) / 10 : null,
          estimatedHours: hours,
          startDate: start,
          dueDate: addWorkdays(start, hours / HOURS_PER_DAY),
          workType: t.work_type,
          classification: t.classification,
          difficulty: t.difficulty_coefficient,
        });
      }
      byTemplate.set(t.code, planned);
      out.push(...planned);
    }
    pending = pending.filter((t) => !batch.includes(t));
  }
  return out;
}

function pickPrerequisite(prereqs: PlannedTask[], floorLabel: string | null): PlannedTask | null {
  if (prereqs.length === 0) return null;
  if (floorLabel) {
    const sameFloor = prereqs.find((p) => p.floorLabel === floorLabel);
    if (sameFloor) return sameFloor;
  }
  // Project-wide dependent (or no same-floor match): wait for the last to finish.
  return prereqs.reduce((latest, p) => (p.dueDate > latest.dueDate ? p : latest));
}
