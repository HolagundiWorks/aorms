/**
 * Field configs for the five compliance sub-tables (migration 0015) — kept
 * out of lib/actions/compliance.ts because a "use server" file may only
 * export async functions, and this is plain shared data/config.
 */
export type ComplianceTable =
  | "compliance_far"
  | "compliance_setback"
  | "compliance_nbc"
  | "compliance_fire"
  | "compliance_regulation";

export const NUMERIC_FIELDS = new Set([
  "plot_area_min_sqm",
  "plot_area_max_sqm",
  "far",
  "ground_coverage_pct",
  "max_height_m",
  "frontage_min_m",
  "frontage_max_m",
  "front_m",
  "rear_m",
  "side1_m",
  "side2_m",
  "staircase_width_m",
]);

export const TABLE_FIELDS: Record<ComplianceTable, { name: string; required: boolean }[]> = {
  compliance_far: [
    { name: "zone", required: true },
    { name: "plot_type", required: false },
    { name: "plot_area_min_sqm", required: false },
    { name: "plot_area_max_sqm", required: false },
    { name: "far", required: true },
    { name: "ground_coverage_pct", required: false },
    { name: "max_height_m", required: false },
    { name: "notes", required: false },
  ],
  compliance_setback: [
    { name: "zone", required: true },
    { name: "plot_type", required: false },
    { name: "frontage_min_m", required: false },
    { name: "frontage_max_m", required: false },
    { name: "front_m", required: false },
    { name: "rear_m", required: false },
    { name: "side1_m", required: false },
    { name: "side2_m", required: false },
    { name: "notes", required: false },
  ],
  compliance_nbc: [
    { name: "clause", required: true },
    { name: "title", required: true },
    { name: "requirement", required: false },
    { name: "applicability", required: false },
    { name: "notes", required: false },
  ],
  compliance_fire: [
    { name: "building_type", required: true },
    { name: "height_band_m", required: false },
    { name: "requirement", required: false },
    { name: "refuge_area", required: false },
    { name: "staircase_width_m", required: false },
    { name: "notes", required: false },
  ],
  compliance_regulation: [
    { name: "authority", required: true },
    { name: "ref_no", required: false },
    { name: "title", required: true },
    { name: "summary", required: false },
    { name: "link", required: false },
    { name: "notes", required: false },
  ],
};

export function complianceFields(table: ComplianceTable) {
  return TABLE_FIELDS[table];
}
