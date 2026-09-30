import type { AreaBasis, TemplateScope } from "./estimate";

/**
 * Starter library for an architectural practice — loaded once per firm from
 * /tasks/library, then edited freely. Hours are first-pass office norms
 * (a 6-productive-hour day), meant to be tuned to the practice's own
 * actuals; they are not a published standard.
 */
export type StarterEntry = {
  code: string;
  title: string;
  bundle: string;
  scope: TemplateScope;
  area_basis: AreaBasis;
  base_hours: number;
  hours_per_100sqm: number;
  min_hours?: number;
  max_hours?: number;
  work_type: string;
  classification?: string;
  difficulty_coefficient?: number;
  sequence: number;
};

const DD = "DESIGN_DEVELOPMENT";
const DC = "DESIGN_COMMUNICATION";
const TP = "TECHNICAL_PRODUCTION";
const CS = "CONSTRUCTION_SUPPORT";

export const STARTER_LIBRARY: StarterEntry[] = [
  // Concept & design development
  { code: "CON-BRIEF", title: "Site study & brief analysis", bundle: "Concept design", scope: "PROJECT", area_basis: "SITE", base_hours: 8, hours_per_100sqm: 0.5, min_hours: 8, max_hours: 40, work_type: DD, sequence: 10 },
  { code: "CON-PLAN", title: "Concept plan & massing", bundle: "Concept design", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 16, hours_per_100sqm: 1.5, min_hours: 16, max_hours: 120, work_type: DD, difficulty_coefficient: 4, sequence: 20 },
  { code: "CON-PRES", title: "Client concept presentation", bundle: "Concept design", scope: "PROJECT", area_basis: "NONE", base_hours: 8, hours_per_100sqm: 0, work_type: DC, sequence: 30 },
  { code: "DD-PLAN", title: "Design development — floor plan", bundle: "Design development", scope: "PER_FLOOR", area_basis: "FLOOR", base_hours: 6, hours_per_100sqm: 2.5, min_hours: 6, max_hours: 80, work_type: DD, sequence: 40 },
  { code: "DD-3D", title: "3D views & elevations", bundle: "Design development", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 12, hours_per_100sqm: 1, min_hours: 12, max_hours: 80, work_type: DC, sequence: 50 },
  // Statutory
  { code: "STAT-PLAN", title: "Sanction drawing set", bundle: "Statutory approvals", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 14, hours_per_100sqm: 1.2, min_hours: 14, max_hours: 90, work_type: TP, sequence: 60 },
  // Working drawings
  { code: "WD-PLAN", title: "Working drawing — floor plan", bundle: "Working drawings", scope: "PER_FLOOR", area_basis: "FLOOR", base_hours: 8, hours_per_100sqm: 3, min_hours: 8, max_hours: 120, work_type: TP, difficulty_coefficient: 3, sequence: 70 },
  { code: "WD-FURN", title: "Working drawing — furniture & finish layout", bundle: "Working drawings", scope: "PER_FLOOR", area_basis: "FLOOR", base_hours: 4, hours_per_100sqm: 1.5, min_hours: 4, max_hours: 60, work_type: TP, sequence: 80 },
  { code: "WD-ELEC", title: "Working drawing — electrical & lighting layout", bundle: "Working drawings", scope: "PER_FLOOR", area_basis: "FLOOR", base_hours: 4, hours_per_100sqm: 1.2, min_hours: 4, max_hours: 50, work_type: TP, sequence: 90 },
  { code: "WD-SEC", title: "Sections & elevations", bundle: "Working drawings", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 12, hours_per_100sqm: 1.4, min_hours: 12, max_hours: 100, work_type: TP, difficulty_coefficient: 4, sequence: 100 },
  { code: "WD-DET", title: "Construction details (stair, toilet, façade)", bundle: "Working drawings", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 16, hours_per_100sqm: 1, min_hours: 16, max_hours: 100, work_type: TP, difficulty_coefficient: 4, sequence: 110 },
  { code: "WD-SCHED", title: "Door / window / finish schedules", bundle: "Working drawings", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 6, hours_per_100sqm: 0.5, min_hours: 6, max_hours: 40, work_type: TP, sequence: 120 },
  { code: "WD-COORD", title: "Consultant coordination (structure / MEP)", bundle: "Working drawings", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 8, hours_per_100sqm: 0.6, min_hours: 8, max_hours: 60, work_type: DC, classification: "COLLABORATION", sequence: 130 },
  // Tender & site
  { code: "TND-PKG", title: "Tender package & BOQ review", bundle: "Tender & construction support", scope: "PROJECT", area_basis: "BUILT_UP", base_hours: 10, hours_per_100sqm: 0.5, min_hours: 10, max_hours: 50, work_type: CS, sequence: 140 },
  { code: "SITE-VISIT", title: "Site visit & inspection report", bundle: "Tender & construction support", scope: "PROJECT", area_basis: "NONE", base_hours: 6, hours_per_100sqm: 0, work_type: CS, sequence: 150 },
];
