import { HOURS_PER_DAY, addWorkdays } from "./dates";

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
 * Expands chosen library entries against a project's scale into concrete
 * tasks: one per entry for PROJECT scope, one per floor for PER_FLOOR scope,
 * each with hours from the formula and a due date = start + working days.
 * Every task starts on `startISO` — the team can stagger them afterwards by
 * dragging deadlines on the calendar; the generator only supplies a
 * realistic *duration*, it does not guess the office's sequencing.
 */
export function planTasks(
  templates: TaskTemplate[],
  scale: ProjectScale,
  startISO: string,
  complexity = 1,
): PlannedTask[] {
  const out: PlannedTask[] = [];
  const sorted = [...templates].sort((a, b) => a.sequence - b.sequence || a.title.localeCompare(b.title));
  for (const t of sorted) {
    const targets =
      t.scope === "PER_FLOOR"
        ? scale.floors.map((f) => ({ label: f.label as string | null, area: f.areaSqm }))
        : [{ label: null as string | null, area: areaFor(t, scale) }];
    for (const target of targets) {
      const area = t.scope === "PER_FLOOR" ? areaFor(t, scale, target.area) : target.area;
      const hours = estimateHours(t, area, complexity);
      out.push({
        templateId: t.id,
        title: target.label ? `${t.title} — ${target.label}` : t.title,
        floorLabel: target.label,
        areaSqm: area > 0 ? Math.round(area * 10) / 10 : null,
        estimatedHours: hours,
        startDate: startISO,
        dueDate: addWorkdays(startISO, hours / HOURS_PER_DAY),
        workType: t.work_type,
        classification: t.classification,
        difficulty: t.difficulty_coefficient,
      });
    }
  }
  return out;
}
