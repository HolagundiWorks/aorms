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

// ── The other ~12 AQC take-off categories — flagged as a follow-up in
// migration 0027_project_takeoff.sql, ported here. Each is a simple L×B×T
// (or similar) volume/area formula, none with the masonry/plaster/paint
// family's opening-deduction complexity except Flooring (which reuses
// deductFaceArea() above). "Shuttering" is deliberately not ported — AQC
// itself computes it only from RCC members, never as a manually-measured
// category ("Shuttering is calculated from RCC concrete members — not
// entered manually", CivilBoqCalculator.cs's own Checks note). ──

export type SimpleResult = {
  unit: "m" | "m²" | "m³";
  qty: number;
  areaM2: number;
  volumeM3: number;
  cementBags: number;
  sandM3: number;
  aggregateM3: number;
};

const NO_YIELD = { cementBags: 0, sandM3: 0, aggregateM3: 0 };

export const PccFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  thicknessMm: z.number().positive().default(100),
  mix: z.string().default("1:4:8"),
});
export type PccFields = z.infer<typeof PccFields>;

/** PCC's own material split — the *proper* mix-ratio yield (same shape as
 * mortarYield's dry-factor split, just concrete's 1.54 dry factor and a
 * 1:4:8 fallback when no aggregate part is given). Ported from
 * CivilBoqCalculator.YieldPcc() — deliberately NOT the same formula Screed
 * uses below (AQC itself splits these two differently; ported as-is, not
 * unified, since that's a real distinction in the reference, not a bug). */
function pccYield(mix: string, wetVolumeM3: number): MaterialYield {
  if (wetVolumeM3 <= 0) return { cementBags: 0, sandM3: 0, aggregateM3: 0 };
  let { c, s, a } = parseMix(mix);
  if (a <= 0) {
    c = 1;
    s = 4;
    a = 8;
  }
  const dry = wetVolumeM3 * 1.54; // MaterialsCalculator.DryFactor
  const parts = c + s + a;
  const cementM3 = dry * (c / parts);
  return {
    cementBags: round3((cementM3 * CEMENT_DENSITY_KG_PER_M3) / CEMENT_BAG_KG),
    sandM3: round3(dry * (s / parts)),
    aggregateM3: round3(dry * (a / parts)),
  };
}

/** Ported from CivilBoqCalculator.PccLines(). */
export function computePcc(input: PccFields): SimpleResult {
  const volumeM3 = (input.lengthMm * input.breadthMm * input.thicknessMm) / 1e9;
  return { unit: "m³", qty: round3(volumeM3), areaM2: 0, volumeM3: round3(volumeM3), ...pccYield(input.mix, volumeM3) };
}

export const EarthworkFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  depthMm: z.number().positive(),
  workType: z.string().default("Excavation"),
});
export type EarthworkFields = z.infer<typeof EarthworkFields>;

/** Ported from CivilBoqCalculator.EarthLines() — no material yield (AQC's own note: "no material yield"). */
export function computeEarthwork(input: EarthworkFields): SimpleResult {
  const volumeM3 = (input.lengthMm * input.breadthMm * input.depthMm) / 1e9;
  return { unit: "m³", qty: round3(volumeM3), areaM2: 0, volumeM3: round3(volumeM3), ...NO_YIELD };
}

export const SsmFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  heightMm: z.number().positive(),
  mortarMix: z.string().default("1:6"),
});
export type SsmFields = z.infer<typeof SsmFields>;

/** Ported from CivilBoqCalculator.SsmLines() — size-stone masonry, 30% mortar fraction (AQC's SsmMortarFraction default, same value as masonry's own MORTAR_FRACTION). */
export function computeSsm(input: SsmFields): SimpleResult {
  const volumeM3 = (input.lengthMm * input.breadthMm * input.heightMm) / 1e9;
  const mortar = mortarYield(input.mortarMix, volumeM3 * MORTAR_FRACTION);
  return { unit: "m³", qty: round3(volumeM3), areaM2: 0, volumeM3: round3(volumeM3), ...mortar };
}

export const WaterproofingWorkMode = z.enum(["Area", "Periphery"]);
export type WaterproofingWorkMode = z.infer<typeof WaterproofingWorkMode>;

export const WaterproofingFields = z.object({
  workMode: WaterproofingWorkMode.default("Area"),
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive().default(0),
  heightMm: z.number().positive().default(0),
});
export type WaterproofingFields = z.infer<typeof WaterproofingFields>;

/** Ported from CivilBoqCalculator.WaterproofingLines() — "Area" mode is length×breadth (a slab/terrace); "Periphery" mode is length×height (a vertical band, e.g. around a parapet upstand). */
export function computeWaterproofing(input: WaterproofingFields): SimpleResult {
  const areaM2 =
    input.workMode === "Periphery"
      ? (input.lengthMm * input.heightMm) / 1e6
      : (input.lengthMm * input.breadthMm) / 1e6;
  return { unit: "m²", qty: round3(areaM2), areaM2: round3(areaM2), volumeM3: 0, ...NO_YIELD };
}

export const DpcFields = z.object({
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  thicknessMm: z.number().positive().default(40),
  mortarMix: z.string().default("1:3"),
});
export type DpcFields = z.infer<typeof DpcFields>;

/** Ported from CivilBoqCalculator.DpcLines() — damp-proof course; area + volume, no material split computed (AQC reports volume as a note only). */
export function computeDpc(input: DpcFields): SimpleResult {
  const areaM2 = (input.lengthMm * input.widthMm) / 1e6;
  const volumeM3 = (input.lengthMm * input.widthMm * input.thicknessMm) / 1e9;
  return { unit: "m²", qty: round3(areaM2), areaM2: round3(areaM2), volumeM3: round3(volumeM3), ...NO_YIELD };
}

export const CopingFields = z.object({
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  concreteGrade: z.string().default("PCC"),
});
export type CopingFields = z.infer<typeof CopingFields>;

/** Ported from CivilBoqCalculator.CopingLines() — quantity is run length (m), not volume; volume shown as a note only, matching AQC. */
export function computeCoping(input: CopingFields): SimpleResult {
  const lenM = input.lengthMm / 1000;
  const volumeM3 = (input.lengthMm * input.widthMm * input.depthMm) / 1e9;
  return { unit: "m", qty: round3(lenM), areaM2: 0, volumeM3: round3(volumeM3), ...NO_YIELD };
}

export const ScreedFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  thicknessMm: z.number().positive().default(40),
  mix: z.string().default("1:4:8"),
});
export type ScreedFields = z.infer<typeof ScreedFields>;

/** Screed's own rough empirical material yield — a per-mix lookup divisor
 * (0.16 for 1:3:6, 0.28 for 1:5:10, 0.22 default), deliberately cruder than
 * pccYield()'s proper ratio split. Ported from CivilBoqCalculator.
 * ApplyPccMaterials() exactly as AQC has it — not "fixed" to match PCC's
 * formula, since AQC uses two different formulas for these two categories
 * on purpose (not a bug found in AQC, a real design choice, kept as-is). */
function screedYield(mix: string, wetVolumeM3: number): MaterialYield {
  const dry = wetVolumeM3 * 1.52 * WASTAGE;
  const divisor = mix === "1:3:6" ? 0.16 : mix === "1:5:10" ? 0.28 : 0.22;
  return {
    cementBags: round3(dry / divisor),
    sandM3: round3(dry * 0.45),
    aggregateM3: round3(dry * 0.9),
  };
}

/** Ported from CivilBoqCalculator.ScreedLines(). */
export function computeScreed(input: ScreedFields): SimpleResult {
  const areaM2 = (input.lengthMm * input.breadthMm) / 1e6;
  const volumeM3 = (input.lengthMm * input.breadthMm * input.thicknessMm) / 1e9;
  return { unit: "m³", qty: round3(volumeM3), areaM2: round3(areaM2), volumeM3: round3(volumeM3), ...screedYield(input.mix, volumeM3) };
}

export const VdfFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  thicknessMm: z.number().positive().default(100),
  concreteGrade: z.string().default("M25"),
});
export type VdfFields = z.infer<typeof VdfFields>;

/** Ported from CivilBoqCalculator.VdfLines() — vacuum-dewatered flooring; area is the priced quantity, volume shown as a note only, no material yield computed (matching AQC). */
export function computeVdf(input: VdfFields): SimpleResult {
  const areaM2 = (input.lengthMm * input.breadthMm) / 1e6;
  const volumeM3 = (input.lengthMm * input.breadthMm * input.thicknessMm) / 1e9;
  return { unit: "m²", qty: round3(areaM2), areaM2: round3(areaM2), volumeM3: round3(volumeM3), ...NO_YIELD };
}

export const SkirtingFields = z.object({
  lengthMm: z.number().positive(),
  heightMm: z.number().positive().default(100),
  finishType: z.string().default("Tile"),
});
export type SkirtingFields = z.infer<typeof SkirtingFields>;

/** Ported from CivilBoqCalculator.SkirtingLines(). */
export function computeSkirting(input: SkirtingFields): SimpleResult {
  const areaM2 = (input.lengthMm * input.heightMm) / 1e6;
  return { unit: "m²", qty: round3(areaM2), areaM2: round3(areaM2), volumeM3: 0, ...NO_YIELD };
}

export const ParapetFields = z.object({
  lengthMm: z.number().positive(),
  heightMm: z.number().positive().default(900),
  thicknessMm: z.number().positive().default(115),
  unitType: WallUnitType.default("Brick"),
  blockSize: z.string().default("600x200x150"),
});
export type ParapetFields = z.infer<typeof ParapetFields>;

export type ParapetResult = SimpleResult & { bricks: number; accBlocks: number; cementBlocks: number };

/** Ported from CivilBoqCalculator.ParapetLines() — reuses the same brick/block yield masonry uses (YieldUnits()), no opening deduction (a parapet has no doors/windows). */
export function computeParapet(input: ParapetFields): ParapetResult {
  const volumeM3 = (input.lengthMm * input.heightMm * input.thicknessMm) / 1e9;
  const faceM2 = (input.lengthMm * input.heightMm) / 1e6;
  const is110 = input.thicknessMm <= 120;

  let bricks = 0,
    accBlocks = 0,
    cementBlocks = 0;
  if (input.unitType === "Brick") {
    bricks = is110
      ? round3(faceM2 * BRICKS_PER_M2_HALF * WASTAGE)
      : round3(volumeM3 * BRICKS_PER_M3 * WASTAGE);
  } else {
    const { l, h } = parseBlockMm(input.blockSize);
    const count = is110
      ? round3((faceM2 / Math.max(1e-6, (l / 1000) * (h / 1000))) * WASTAGE)
      : round3((volumeM3 / Math.max(1e-9, blockVolumeM3(input.blockSize))) * WASTAGE);
    if (input.unitType === "ACC Block") accBlocks = count;
    else cementBlocks = count;
  }

  return {
    unit: "m³",
    qty: round3(volumeM3),
    areaM2: round3(faceM2),
    volumeM3: round3(volumeM3),
    cementBags: 0,
    sandM3: 0,
    aggregateM3: 0,
    bricks,
    accBlocks,
    cementBlocks,
  };
}

export const PlinthProtectionFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive().default(600),
  thicknessMm: z.number().positive().default(75),
  finishType: z.string().default("PCC"),
});
export type PlinthProtectionFields = z.infer<typeof PlinthProtectionFields>;

/** Ported from CivilBoqCalculator.PlinthProtectionLines(). */
export function computePlinthProtection(input: PlinthProtectionFields): SimpleResult {
  const areaM2 = (input.lengthMm * input.breadthMm) / 1e6;
  const volumeM3 = (input.lengthMm * input.breadthMm * input.thicknessMm) / 1e9;
  return { unit: "m²", qty: round3(areaM2), areaM2: round3(areaM2), volumeM3: round3(volumeM3), ...NO_YIELD };
}

export const FlooringFields = z.object({
  lengthMm: z.number().positive(),
  breadthMm: z.number().positive(),
  deductRule: DeductRule.default("Openings full"),
  finishType: z.string().default("Vitrified tiles"),
  surfaceKind: z.enum(["Floor", "Wall"]).default("Floor"),
});
export type FlooringFields = z.infer<typeof FlooringFields>;

export type FlooringResult = { areaM2: number; note: string };

/** Ported from CivilBoqCalculator.FlooringLines() — plan area (length ×
 * breadth) net of openings on the linked wall_mark, same deduction engine
 * masonry/plaster/painting use above (the only one of these ~12 "simple"
 * categories that has deduction logic at all). */
export function computeFlooring(input: FlooringFields, openings: LinkedOpening[]): FlooringResult {
  const { netM2, note } = deductFaceArea(input.lengthMm, input.breadthMm, openings, input.deductRule, false, 0);
  return { areaM2: round3(netM2), note };
}

// ── Shared dispatcher — turns one stored takeoff_items row into a single
// {description, unit, quantity}, for "send to Estimate" (web/lib/actions/
// estimates.ts's sendTakeoffItemToEstimate). Kept separate from the
// richer per-category rendering in app/(app)/takeoff/[projectId]/page.tsx
// (which shows dims/materials/notes columns, not just one quantity) —
// this dispatcher only needs to answer "what row would this become in an
// Estimate", so it doesn't replace that page's existing, already-verified
// table logic. ──

export type StoredTakeoffItem = {
  id: string;
  category: string;
  mark: string;
  wall_mark: string | null;
  fields: unknown;
};

/** Doors/windows on the same project sharing a wall_mark (case-insensitive), as the LinkedOpening shape deductFaceArea() expects. */
export function linkedOpeningsFromRows(rows: StoredTakeoffItem[], wallMark: string | null): LinkedOpening[] {
  if (!wallMark) return [];
  return rows
    .filter((o) => (o.category === "DOOR" || o.category === "WINDOW") && (o.wall_mark ?? "").toLowerCase() === wallMark.toLowerCase())
    .map((o) => {
      const f = OpeningFields.safeParse(o.fields);
      return f.success ? { widthMm: f.data.widthMm, heightMm: f.data.heightMm, nos: f.data.nos, deductFromWall: f.data.deductFromWall } : null;
    })
    .filter((x): x is LinkedOpening => x !== null);
}

export type TakeoffQuantity = { description: string; unit: string; quantity: number };

/** One row's {description, unit, quantity} — the only three fields an
 * estimate_item actually needs. Returns null when the stored fields don't
 * parse (shouldn't happen for a row this app itself wrote, but a stored
 * jsonb blob is never fully trusted). */
export function computeTakeoffQuantity(row: StoredTakeoffItem, allRows: StoredTakeoffItem[]): TakeoffQuantity | null {
  switch (row.category) {
    case "MASONRY": {
      const f = MasonryFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeMasonry(f.data, linkedOpeningsFromRows(allRows, row.mark));
      return { description: `Masonry wall ${row.mark} — ${f.data.thicknessMm} mm (${f.data.unitType})`, unit: r.unit, quantity: r.qty };
    }
    case "PLASTER": {
      const f = PlasterFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computePlaster(f.data, linkedOpeningsFromRows(allRows, row.wall_mark));
      return { description: `Plaster ${row.mark} — ${f.data.thicknessMm} mm, CM ${f.data.mortarMix}`, unit: "m²", quantity: r.areaM2 };
    }
    case "PAINTING": {
      const f = PaintingFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computePainting(f.data, linkedOpeningsFromRows(allRows, row.wall_mark));
      return { description: `Painting ${row.mark} — ${f.data.paintType}, ${f.data.coats} coats`, unit: "m²", quantity: r.areaM2 };
    }
    case "DOOR":
    case "WINDOW": {
      const f = OpeningFields.safeParse(row.fields);
      if (!f.success) return null;
      const label = row.category === "DOOR" ? "Door" : "Window";
      return { description: `${label} ${row.mark} — ${f.data.widthMm}×${f.data.heightMm} mm × ${f.data.nos} nos`, unit: "m²", quantity: computeOpeningAreaM2(f.data) };
    }
    case "FLOORING": {
      const f = FlooringFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeFlooring(f.data, linkedOpeningsFromRows(allRows, row.wall_mark));
      return { description: `Flooring ${row.mark} — ${f.data.finishType}`, unit: "m²", quantity: r.areaM2 };
    }
    case "PCC": {
      const f = PccFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computePcc(f.data);
      return { description: `PCC ${row.mark} — ${f.data.mix}`, unit: r.unit, quantity: r.qty };
    }
    case "EARTHWORK": {
      const f = EarthworkFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeEarthwork(f.data);
      return { description: `Earthwork ${row.mark} — ${f.data.workType}`, unit: r.unit, quantity: r.qty };
    }
    case "SSM": {
      const f = SsmFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeSsm(f.data);
      return { description: `Size-stone masonry ${row.mark} — CM ${f.data.mortarMix}`, unit: r.unit, quantity: r.qty };
    }
    case "WATERPROOFING": {
      const f = WaterproofingFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeWaterproofing(f.data);
      return { description: `Waterproofing ${row.mark} — ${f.data.workMode}`, unit: r.unit, quantity: r.qty };
    }
    case "DPC": {
      const f = DpcFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeDpc(f.data);
      return { description: `DPC ${row.mark} — ${f.data.mortarMix}`, unit: r.unit, quantity: r.qty };
    }
    case "COPING": {
      const f = CopingFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeCoping(f.data);
      return { description: `Coping ${row.mark} — ${f.data.concreteGrade}`, unit: r.unit, quantity: r.qty };
    }
    case "SCREED": {
      const f = ScreedFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeScreed(f.data);
      return { description: `Screed ${row.mark} — ${f.data.mix}`, unit: r.unit, quantity: r.qty };
    }
    case "VDF": {
      const f = VdfFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeVdf(f.data);
      return { description: `VDF ${row.mark} — ${f.data.concreteGrade}`, unit: r.unit, quantity: r.qty };
    }
    case "SKIRTING": {
      const f = SkirtingFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeSkirting(f.data);
      return { description: `Skirting ${row.mark} — ${f.data.finishType}`, unit: r.unit, quantity: r.qty };
    }
    case "PARAPET": {
      const f = ParapetFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computeParapet(f.data);
      return { description: `Parapet ${row.mark} — ${f.data.thicknessMm} mm (${f.data.unitType})`, unit: r.unit, quantity: r.qty };
    }
    case "PLINTH_PROTECTION": {
      const f = PlinthProtectionFields.safeParse(row.fields);
      if (!f.success) return null;
      const r = computePlinthProtection(f.data);
      return { description: `Plinth protection ${row.mark} — ${f.data.finishType}`, unit: r.unit, quantity: r.qty };
    }
    default:
      return null;
  }
}
