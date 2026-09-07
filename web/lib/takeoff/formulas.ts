import { z } from "zod";

/**
 * Project take-off — IS 1200 wall measurement (masonry/plaster/painting)
 * with door/window opening deductions. Ported from HolagundiWorks/AQC's
 * BBSApp/Services/{CivilBoqCalculator,MaterialsCalculator}.cs — the real
 * architecture (read in full this session, not just Model.h's structs) is
 * a flat per-category measured-item list with quantities *computed* from
 * dimension fields + a deduction rule, not a 3D building/room graph. See
 * migration 0027_project_takeoff.sql's header for the full account of what
 * this is and deliberately isn't (masonry/plaster/painting only, not the
 * other ~15 AQC categories — PCC/earthwork/flooring/etc.).
 *
 * All money-free (quantity take-off only, matching AQC's own "Quantity
 * take-off only — no rates" note) — feeding a priced estimate_item is a
 * manual copy-across for now, not automated in this pass.
 */

export const DeductRule = z.enum(["None", "Openings full", "IS1200 masonry", "IS1200 plaster/paint"]);
export type DeductRule = z.infer<typeof DeductRule>;

export const WallUnitType = z.enum(["Brick", "ACC Block", "Cement Block"]);
export type WallUnitType = z.infer<typeof WallUnitType>;

// ── Shared dimension fields (MASONRY/PLASTER/PAINTING are all "wall-face"
// measurements: length × height, net of openings on the same wall_mark) ──

const WallFaceFields = z.object({
  lengthMm: z.number().positive(),
  heightMm: z.number().positive(),
  deductRule: DeductRule.default("Openings full"),
});

export const MasonryFields = WallFaceFields.extend({
  thicknessMm: z.number().positive().default(230),
  unitType: WallUnitType.default("Brick"),
  /** "L x H x T" mm, e.g. "600x200x150" — only used for ACC/Cement Block. */
  blockSize: z.string().default("600x200x150"),
  mortarMix: z.string().default("1:6"),
});
export type MasonryFields = z.infer<typeof MasonryFields>;

export const PlasterFields = WallFaceFields.extend({
  deductRule: DeductRule.default("IS1200 plaster/paint"),
  thicknessMm: z.number().positive().default(12),
  mortarMix: z.string().default("1:4"),
  faces: z.number().int().min(1).max(2).default(1),
  addJambs: z.boolean().default(false),
});
export type PlasterFields = z.infer<typeof PlasterFields>;

export const PaintingFields = WallFaceFields.extend({
  deductRule: DeductRule.default("IS1200 plaster/paint"),
  paintType: z.string().default("Emulsion"),
  coats: z.number().int().min(1).default(2),
  faces: z.number().int().min(1).max(2).default(1),
  addJambs: z.boolean().default(false),
});
export type PaintingFields = z.infer<typeof PaintingFields>;

/** A door/window schedule row — what MASONRY/PLASTER/PAINTING deduct against via wall_mark. */
export const OpeningFields = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  nos: z.number().int().min(1).default(1),
  deductFromWall: z.boolean().default(true),
});
export type OpeningFields = z.infer<typeof OpeningFields>;

export type LinkedOpening = { widthMm: number; heightMm: number; nos: number; deductFromWall: boolean };

// ── Constants (AQC's CivilYields defaults, BBSApp/Services/ProjectStore.cs) ──

const MORTAR_DRY_FACTOR = 1.33;
const CEMENT_BAG_KG = 50;
const CEMENT_DENSITY_KG_PER_M3 = 1440;
const BRICKS_PER_M3 = 500;
const BRICKS_PER_M2_HALF = 55;
const WASTAGE = 1.05;
const MORTAR_FRACTION = 0.3;
/** IS 1200 masonry ignores openings below this area — plaster/paint always deduct in full. */
const IGNORE_OPENING_BELOW_M2 = 0.1;
/** Jamb reveal when no explicit wall thickness is available. */
const DEFAULT_JAMB_REVEAL_MM = 100;

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** "1:6" → {c:1, s:6, a:0}; "1:4:8" → {c:1, s:4, a:8}. Defaults 1:6 on a blank/unparseable mix. */
export function parseMix(mix: string): { c: number; s: number; a: number } {
  const parts = (mix ?? "")
    .split(":")
    .map((s) => s.trim())
    .filter(Boolean);
  let c = 1,
    s = 6,
    a = 0;
  if (parts[0] !== undefined && Number.isFinite(Number(parts[0]))) c = Number(parts[0]);
  if (parts[1] !== undefined && Number.isFinite(Number(parts[1]))) s = Number(parts[1]);
  if (parts[2] !== undefined && Number.isFinite(Number(parts[2]))) a = Number(parts[2]);
  return { c, s, a };
}

export type MaterialYield = { cementBags: number; sandM3: number; aggregateM3: number };

/** Cement/sand/aggregate from a wet mortar volume (m³) + mix ratio (e.g. "1:6"). */
export function mortarYield(mix: string, wetVolumeM3: number): MaterialYield {
  if (wetVolumeM3 <= 0) return { cementBags: 0, sandM3: 0, aggregateM3: 0 };
  const { c, s, a } = parseMix(mix);
  const dry = wetVolumeM3 * MORTAR_DRY_FACTOR;
  const parts = c + s + a;
  if (parts <= 0) return { cementBags: 0, sandM3: 0, aggregateM3: 0 };
  const cementM3 = dry * (c / parts);
  const sandM3 = dry * (s / parts);
  const aggM3 = a > 0 ? dry * (a / parts) : 0;
  return {
    cementBags: round3((cementM3 * CEMENT_DENSITY_KG_PER_M3) / CEMENT_BAG_KG),
    sandM3: round3(sandM3),
    aggregateM3: round3(aggM3),
  };
}

/** "600x200x150" → [L, H, T] mm. Defaults to a standard ACC block on a blank/unparseable size. */
function parseBlockMm(size: string): { l: number; h: number; t: number } {
  const p = (size ?? "")
    .toLowerCase()
    .split("x")
    .map((s) => s.trim())
    .filter(Boolean);
  let l = 600,
    h = 200,
    t = 150;
  if (p[0] !== undefined && Number.isFinite(Number(p[0]))) l = Number(p[0]);
  if (p[1] !== undefined && Number.isFinite(Number(p[1]))) h = Number(p[1]);
  if (p[2] !== undefined && Number.isFinite(Number(p[2]))) t = Number(p[2]);
  return { l, h, t };
}

function blockVolumeM3(size: string): number {
  const { l, h, t } = parseBlockMm(size);
  return (l * h * t) / 1e9;
}

/**
 * Sum the deductible opening area (m²) from a wall's linked door/window
 * rows. "IS1200 masonry" ignores individual openings below
 * IGNORE_OPENING_BELOW_M2 (0.1 m²) — every other rule (including "IS1200
 * plaster/paint") deducts every linked opening in full, matching AQC's
 * OneOpeningMm2()/OpeningAreaMm2() exactly.
 */
export function openingAreaM2(openings: LinkedOpening[], rule: DeductRule): number {
  if (rule === "None") return 0;
  const masonryRule = rule === "IS1200 masonry";
  let sum = 0;
  for (const o of openings) {
    if (!o.deductFromWall) continue;
    if (o.widthMm <= 0 || o.heightMm <= 0) continue;
    const nos = o.nos > 0 ? o.nos : 1;
    const eachM2 = (o.widthMm * o.heightMm) / 1e6;
    if (masonryRule && eachM2 < IGNORE_OPENING_BELOW_M2) continue;
    sum += nos * eachM2;
  }
  return sum;
}

/** Jamb (reveal) area to add back for plaster/paint — 2 sides + top per opening, not the sill. */
export function jambAreaM2(openings: LinkedOpening[], revealMm: number): number {
  const reveal = revealMm > 0 ? revealMm / 1000 : DEFAULT_JAMB_REVEAL_MM / 1000;
  let sum = 0;
  for (const o of openings) {
    if (!o.deductFromWall) continue;
    if (o.widthMm <= 0 || o.heightMm <= 0) continue;
    const nos = o.nos > 0 ? o.nos : 1;
    sum += nos * (2 * (o.heightMm / 1000) + o.widthMm / 1000) * reveal;
  }
  return sum;
}

export type DeductedArea = { grossM2: number; deductM2: number; netM2: number; note: string };

/**
 * Gross wall-face area (length × height) minus linked-opening deductions,
 * plus jamb area when addJambs is set for a plaster/paint-style rule.
 * Ported from CivilBoqCalculator.DeductFaceArea().
 */
export function deductFaceArea(
  lengthMm: number,
  heightMm: number,
  openings: LinkedOpening[],
  rule: DeductRule,
  addJambs: boolean,
  jambRevealMm: number,
): DeductedArea {
  const grossM2 = Math.max(0, (lengthMm * heightMm) / 1e6);
  if (rule === "None") return { grossM2, deductM2: 0, netM2: grossM2, note: "gross (no deduct)" };

  const deductM2 = openingAreaM2(openings, rule);
  const plasterStyle = rule === "IS1200 plaster/paint";
  const jambAddM2 = addJambs && plasterStyle ? jambAreaM2(openings, jambRevealMm) : 0;
  const netM2 = Math.max(0, grossM2 - deductM2 + jambAddM2);
  const note =
    `gross ${round3(grossM2)} − deduct ${round3(deductM2)}` +
    (jambAddM2 > 0 ? ` + jambs ${round3(jambAddM2)}` : "") +
    ` = net ${round3(netM2)} m²`;
  return { grossM2, deductM2, netM2, note };
}

export type MasonryResult = {
  unit: "m²" | "m³";
  qty: number;
  bricks: number;
  accBlocks: number;
  cementBlocks: number;
  cementBags: number;
  sandM3: number;
  aggregateM3: number;
  note: string;
};

/** Ported from CivilBoqCalculator.MasonryLines()/YieldUnits(). */
export function computeMasonry(input: MasonryFields, openings: LinkedOpening[]): MasonryResult {
  const { netM2, note } = deductFaceArea(input.lengthMm, input.heightMm, openings, input.deductRule, false, 0);
  const is110 = Math.abs(input.thicknessMm - 110) < 1 || input.thicknessMm <= 120;

  let bricks = 0,
    accBlocks = 0,
    cementBlocks = 0;
  let qty: number;
  let unit: "m²" | "m³";
  let mortarVolM3: number;

  if (is110) {
    unit = "m²";
    qty = round3(netM2);
    mortarVolM3 = netM2 * (input.thicknessMm / 1000) * MORTAR_FRACTION;
    if (input.unitType === "Brick") {
      bricks = round3(netM2 * BRICKS_PER_M2_HALF * WASTAGE);
    } else {
      const { l, h } = parseBlockMm(input.blockSize);
      const faceM2 = Math.max(1e-6, (l / 1000) * (h / 1000));
      const count = round3((netM2 / faceM2) * WASTAGE);
      if (input.unitType === "ACC Block") accBlocks = count;
      else cementBlocks = count;
    }
  } else {
    const volumeM3 = netM2 * (input.thicknessMm / 1000);
    unit = "m³";
    qty = round3(volumeM3);
    mortarVolM3 = volumeM3 * MORTAR_FRACTION;
    if (input.unitType === "Brick") {
      bricks = round3(volumeM3 * BRICKS_PER_M3 * WASTAGE);
    } else {
      const each = blockVolumeM3(input.blockSize);
      const count = each > 0 ? round3((volumeM3 / each) * WASTAGE) : 0;
      if (input.unitType === "ACC Block") accBlocks = count;
      else cementBlocks = count;
    }
  }

  const mortar = mortarYield(input.mortarMix, mortarVolM3);
  return { unit, qty, bricks, accBlocks, cementBlocks, ...mortar, note };
}

export type PlasterResult = {
  areaM2: number;
  cementBags: number;
  sandM3: number;
  aggregateM3: number;
  note: string;
};

/** Ported from CivilBoqCalculator.PlasterLines(). */
export function computePlaster(input: PlasterFields, openings: LinkedOpening[]): PlasterResult {
  const jambReveal = input.thicknessMm > 0 ? input.thicknessMm : DEFAULT_JAMB_REVEAL_MM;
  const { netM2, note } = deductFaceArea(
    input.lengthMm,
    input.heightMm,
    openings,
    input.deductRule,
    input.addJambs,
    jambReveal,
  );
  const areaM2 = netM2 * input.faces;
  const wetVolM3 = areaM2 * (input.thicknessMm / 1000);
  const mortar = mortarYield(input.mortarMix, wetVolM3);
  return { areaM2: round3(areaM2), ...mortar, note };
}

export type PaintingResult = { areaM2: number; note: string };

/** Ported from CivilBoqCalculator.PaintingLines() — area only, no material yield. */
export function computePainting(input: PaintingFields, openings: LinkedOpening[]): PaintingResult {
  const jambReveal = DEFAULT_JAMB_REVEAL_MM;
  const { netM2, note } = deductFaceArea(
    input.lengthMm,
    input.heightMm,
    openings,
    input.deductRule,
    input.addJambs,
    jambReveal,
  );
  return { areaM2: round3(netM2 * input.faces), note };
}

/** A door/window schedule row's own quantity — width × height × nos, in m². */
export function computeOpeningAreaM2(input: OpeningFields): number {
  return round3((input.widthMm * input.heightMm * input.nos) / 1e6);
}
