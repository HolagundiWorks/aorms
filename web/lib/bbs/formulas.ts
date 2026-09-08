import { z } from "zod";

/**
 * Project Bar Bending Schedule — IS 456 / IS 2502 cutting-length helpers and
 * schedule schemas. Originally ported from packages/contracts/src/bbs.ts;
 * Wall + Stair (below) are now also ported from HolagundiWorks/AQC's C++
 * engine (`BBSDesktop/src/core/Engine.cpp`'s `generate_wall_bbs`/
 * `generate_stair_bbs`), the reference repo this was requested to match —
 * see docs/esti/ROADMAP-CLOUD.md for the full account of what's ported.
 *
 * **Column/Beam reconciliation (2026-09-08):** `calculateColumnStirrups`/
 * `calculateBeamStirrups` below now call `closedLinkCuttingLengthMm()` /
 * `hookedLegCuttingLengthMm()` — the same bend-deduction-aware formula
 * AQC's `closed_link_cutting()`/`hooked_leg_cutting()` use everywhere,
 * already ported and shipped here for Wall's own links. Their previous
 * "perimeter + hooks, no bend deduction" formula wasn't a style choice,
 * it was a missing term — any real bar-bending schedule has to account
 * for the fact that a bar doesn't bend at a sharp corner, so the earlier
 * numbers genuinely overstated cutting length. Retrofitting this was
 * low-risk specifically *because* the replacement formula already existed
 * and was already tested (Wall), not new, unverified logic.
 *
 * **Tie-type auto-resolver (2026-09-08, part two):**
 * `resolveColumnTieType()` ports AQC's `resolve_column_tie()` —
 * `ColumnTieType` now covers all six of AQC's rectangular-column shapes
 * (Closed/Cross Ties/Diagonal Ties/Open Ties/U-Ties/Group Ties, each
 * directly selectable) plus `"Auto"`, which runs the heuristic
 * (bar count + clear dimensions + column shape) the way AQC's own UI
 * does. Two deliberate deviations from AQC's own resolver, not silent
 * fidelity: `"Double Tie"` and the legacy `"Closed+Crosstie"` are both
 * treated as already-final picks rather than falling through AQC's own
 * `Double Tie → U-Ties` alias — this repo's `"Double Tie"` already meant
 * something else (two full nested closed ties) before this resolver
 * existed, so existing stored data's meaning wasn't reinterpreted.
 * `"Closed+Crosstie"` also gained real generation for the first time
 * here (previously a silent no-op duplicate of `"Closed"`) — it now
 * shares `"Cross Ties"`' own peripheral-plus-two-crossties behaviour,
 * matching what its name always implied.
 *
 * **Deliberately still not reconciled — the 135° hook allowance
 * itself**, a genuinely different thing, left open on purpose, not
 * overlooked: `HOOK_ALLOWANCE_PER_HOOK_D[135]` below is 12d; AQC's own
 * `Settings::hook_allowance` uses 10d (both cite IS 2502 — confirmed by
 * reading AQC's actual `Model.h`, not assumed). This is a sourced-
 * differently convention, not a missing term the way bend deduction
 * was, and this repo's own value is already shared consistently across
 * Wall/Stair/Column/Beam — changing it now wouldn't just match AQC, it
 * would silently change Wall/Stair's own already-verified output too.
 * Left as-is, disclosed here rather than picked with false confidence
 * either way.
 *
 * Lengths in mm; weight via d²/162 kg/m.
 */

export const STANDARD_BAR_DIAMETERS_MM = [
  8, 10, 12, 16, 20, 25, 28, 32, 36, 40,
] as const;

/** Hook allowance (× dia) per hooked end — common IS 2502 practice. */
export const HOOK_ALLOWANCE_PER_HOOK_D: Record<90 | 135 | 180, number> = {
  90: 9,
  135: 12,
  180: 16,
};

export const HookAngle = z.union([z.literal(90), z.literal(135), z.literal(180)]);
export type HookAngle = z.infer<typeof HookAngle>;

/**
 * Column tie shape — "Auto" (2026-09-08) runs `resolveColumnTieType()`,
 * the IS 456 Cl. 26.5.3.2 heuristic port of AQC's `resolve_column_tie()`,
 * and generates whichever shape it lands on; the five AQC-native shapes
 * after it (Cross/Group/Open/U/Diagonal Ties) are also directly
 * selectable, matching AQC's own UI. `Closed`/`Circular`/`Spiral` are
 * unchanged. `Closed+Crosstie` now has real behaviour (peripheral closed
 * + two crossties, the same generation `Cross Ties` uses) — it was
 * previously a selectable value that silently produced identical output
 * to plain `Closed`, a no-op its own name didn't disclose; `Double Tie`
 * is deliberately left as this repo's own existing convention (two full
 * nested closed ties) rather than remapped to match AQC's own internal
 * `Double Tie → U-Ties` alias, since those are two different real tie
 * configurations and this repo's stored data already means the former.
 */
export const ColumnTieType = z.enum([
  "Auto",
  "Closed",
  "Closed+Crosstie",
  "Double Tie",
  "Cross Ties",
  "Diagonal Ties",
  "Open Ties",
  "U-Ties",
  "Group Ties",
  "Circular",
  "Spiral",
]);
export type ColumnTieType = z.infer<typeof ColumnTieType>;

/** Column cross-section shape — drives `resolveColumnTieType()`'s own
 * shape-dependent rules (a Square column's own side doubles as both
 * `widthMm`/`depthMm`; Circular ties/Spiral only make sense here). */
export const ColumnShape = z.enum(["Rectangular", "Square", "Circular"]);
export type ColumnShape = z.infer<typeof ColumnShape>;

export const BeamTopBarType = z.enum(["At Support", "Full Span"]);
export type BeamTopBarType = z.infer<typeof BeamTopBarType>;

export const SlabType = z.enum(["One-Way", "Two-Way"]);
export type SlabType = z.infer<typeof SlabType>;

export const ConcreteGrade = z.enum(["M20", "M25", "M30", "M35", "M40"]);
export type ConcreteGrade = z.infer<typeof ConcreteGrade>;

/**
 * Design bond stress τbd for deformed (HYSD) bars (N/mm²) — IS 456 Table 21
 * plain-bar values (M20 1.2, M25 1.4, M30 1.5, M35 1.7, M40 1.9) × the
 * Cl. 26.2.1.1 HYSD uplift factor (1.6). M35/M40 were previously 2.56/2.72
 * here — a bug caught while comparing against HolagundiWorks/AQC's
 * Engine.cpp (which carries the plain-bar table + uplift as two explicit
 * steps and gets 2.72/3.04): 1.7×1.6 = 2.72, not 2.56; 1.9×1.6 = 3.04, not
 * 2.72. M20/M25/M30 already matched (1.2×1.6=1.92, 1.4×1.6=2.24,
 * 1.5×1.6=2.4). Fixed here, independent of AQC — these are IS 456's own
 * published Table 21 numbers, not a matter of convention.
 */
export const CONCRETE_TAU_BD: Record<ConcreteGrade, number> = {
  M20: 1.92,
  M25: 2.24,
  M30: 2.4,
  M35: 2.72,
  M40: 3.04,
};

export const SteelGrade = z.enum(["Fe250", "Fe415", "Fe500", "Fe550"]);
export type SteelGrade = z.infer<typeof SteelGrade>;

export const STEEL_FY: Record<SteelGrade, number> = {
  Fe250: 250,
  Fe415: 415,
  Fe500: 500,
  Fe550: 550,
};

export const BbsElement = z.enum(["COLUMN", "BEAM", "SLAB", "FOOTING", "WALL", "STAIR"]);
export type BbsElement = z.infer<typeof BbsElement>;

export const BBS_ELEMENT_LABEL: Record<BbsElement, string> = {
  COLUMN: "Column",
  BEAM: "Beam",
  SLAB: "Slab",
  FOOTING: "Footing",
  WALL: "Retaining wall",
  STAIR: "Staircase",
};

export const BbsStatus = z.enum(["DRAFT", "ISSUED"]);
export type BbsStatus = z.infer<typeof BbsStatus>;

export const BBS_STATUS_LABEL: Record<BbsStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
};

/** Carbon Tag `type` values — narrower than @carbon/react's own union isn't
 * needed here, a plain string keeps this file free of a UI-library import. */
export const BBS_STATUS_TAG: Record<BbsStatus, string> = {
  DRAFT: "cool-gray",
  ISSUED: "green",
};

export const BbsCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(4000).optional(),
});
export type BbsCreate = z.infer<typeof BbsCreate>;

export const BbsUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: BbsStatus.optional(),
});
export type BbsUpdate = z.infer<typeof BbsUpdate>;

export const BbsItemCreate = z.object({
  bbsId: z.string().uuid(),
  barMark: z.string().min(1).max(40),
  member: z.string().max(120).optional(),
  element: BbsElement.optional(),
  role: z.string().max(40).optional(),
  diaMm: z.number().positive(),
  noOfMembers: z.number().int().positive().default(1),
  barsPerMember: z.number().int().positive().default(1),
  cuttingLengthMm: z.number().positive().max(50_000),
  floor: z.string().max(80).optional(),
  shape: z.string().max(40).optional(),
});
export type BbsItemCreate = z.infer<typeof BbsItemCreate>;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function barUnitWeightKgM(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

export function hookAllowancePerHook(angle: number): number {
  if (angle === 90 || angle === 135 || angle === 180) {
    return HOOK_ALLOWANCE_PER_HOOK_D[angle];
  }
  return 12;
}

export function getTauBd(grade: ConcreteGrade | string): number {
  return CONCRETE_TAU_BD[grade as ConcreteGrade] ?? 1.92;
}

export function getFy(grade: SteelGrade | string): number {
  return STEEL_FY[grade as SteelGrade] ?? 415;
}

/** Ld = φ · 0.87 · fy / (4 · τbd) — IS 456 Cl. 26.2.1. */
export function developmentLengthMm(
  diaMm: number,
  concreteGrade: ConcreteGrade | string,
  steelGrade: SteelGrade | string,
): number {
  const tauBd = getTauBd(concreteGrade);
  if (tauBd <= 0) return 0;
  return (diaMm * 0.87 * getFy(steelGrade)) / (4 * tauBd);
}

/** Nos over a run = ⌊length / spacing⌋ + 1. */
export function barCount(lengthMm: number, spacingMm: number): number {
  if (spacingMm <= 0) return 0;
  return Math.floor(lengthMm / spacingMm) + 1;
}

/** Schedule-line weight: members × bars × length(m) × d²/162. */
export function bbsItemTotals(input: {
  diaMm: number;
  noOfMembers: number;
  barsPerMember: number;
  cuttingLengthMm: number;
}): { totalBars: number; totalLengthM: number; weightKg: number } {
  const totalBars = input.noOfMembers * input.barsPerMember;
  const totalLengthM = (input.cuttingLengthMm / 1000) * totalBars;
  return {
    totalBars,
    totalLengthM: round2(totalLengthM),
    weightKg: round2(totalLengthM * barUnitWeightKgM(input.diaMm)),
  };
}

export function bbsDiameterSummary(
  items: { diaMm: number; weightKg?: number | null; noOfMembers?: number; barsPerMember?: number; cuttingLengthMm?: number }[],
): { diaMm: number; nos: number; totalLengthM: number; weightKg: number }[] {
  const byDia = new Map<number, { nos: number; lengthM: number; weightKg: number }>();
  for (const it of items) {
    const nos =
      it.noOfMembers != null && it.barsPerMember != null
        ? it.noOfMembers * it.barsPerMember
        : 0;
    const lengthM =
      it.cuttingLengthMm != null && nos > 0
        ? (it.cuttingLengthMm / 1000) * nos
        : 0;
    const weightKg =
      it.weightKg != null
        ? it.weightKg
        : round2(lengthM * barUnitWeightKgM(it.diaMm));
    const cur = byDia.get(it.diaMm) ?? { nos: 0, lengthM: 0, weightKg: 0 };
    cur.nos += nos;
    cur.lengthM += lengthM;
    cur.weightKg += weightKg;
    byDia.set(it.diaMm, cur);
  }
  return [...byDia.entries()]
    .map(([diaMm, v]) => ({
      diaMm,
      nos: v.nos,
      totalLengthM: round2(v.lengthM),
      weightKg: round2(v.weightKg),
    }))
    .sort((a, b) => a.diaMm - b.diaMm);
}

// ── Column ties / main bars ──────────────────────────────────────────────────

/**
 * IS 456 Cl. 26.5.3.2 tie-type resolver — port of Engine.cpp's
 * `resolve_column_tie()`. Called for every column regardless of the
 * user's `tieType`, not only when it's "Auto": a direct pick of one of
 * the six rectangular shapes is honoured as-is (with the one override
 * AQC itself applies — "Open Ties" isn't meaningful on a Square column,
 * so it falls back to "Closed" there), while "Auto"/unrecognized/
 * shape-mismatched picks (e.g. "Circular" tie type on a non-Circular
 * column) fall through to the real heuristic: bar count + clear
 * dimensions decide between Closed, Cross/Diagonal Ties (spacing > 75mm
 * per Cl. 26.5.3.2), Group Ties (12+ bars, Square), and Open/U-Ties for
 * rectangular columns with unequal sides. `"Double Tie"` deliberately
 * does NOT fall through here — see `ColumnTieType`'s own header comment
 * for why this repo doesn't alias it to AQC's `Double Tie → U-Ties`.
 */
export function resolveColumnTieType(
  tieType: ColumnTieType | string,
  columnShape: ColumnShape | string,
  widthMm: number,
  depthMm: number,
  coverMm: number,
  stirrupDiaMm: number,
  mainBarCount: number,
): ColumnTieType {
  if (columnShape === "Circular") {
    return tieType === "Spiral" ? "Spiral" : "Circular";
  }
  if (tieType === "Circular" || tieType === "Spiral") {
    // Not valid for a square/rectangular column — fall through to Auto.
  } else if (
    tieType === "Closed" ||
    tieType === "Open Ties" ||
    tieType === "U-Ties" ||
    tieType === "Group Ties" ||
    tieType === "Cross Ties" ||
    tieType === "Diagonal Ties" ||
    // Deliberate deviation from AQC's own resolver, disclosed above: AQC
    // aliases "Double Tie" straight to "U-Ties" here; this repo instead
    // treats both legacy values as already-final, honoured as picked.
    tieType === "Double Tie" ||
    tieType === "Closed+Crosstie"
  ) {
    if (columnShape === "Square" && tieType === "Open Ties") return "Closed";
    return tieType;
  }

  const w = widthMm;
  let d = depthMm;
  if (columnShape === "Square" || columnShape === "Circular") d = w;

  const minSide = Math.min(w, d);
  const clearB = Math.max(1, w - 2 * coverMm);
  const clearD = Math.max(1, d - 2 * coverMm);
  const longer = Math.max(clearB, clearD);
  const along = Math.max(2, Math.floor((mainBarCount + 3) / 4) + 1);
  const spacing = longer / Math.max(1, along - 1);

  if (mainBarCount <= 4 || minSide <= 300) return "Closed";
  if (mainBarCount <= 8) {
    if (spacing > 75) return columnShape === "Square" ? "Cross Ties" : "Diagonal Ties";
    return "Closed";
  }
  if (mainBarCount >= 12 && columnShape === "Square") return "Group Ties";
  if (columnShape !== "Square" && Math.abs(w - d) >= 50) {
    return spacing > 75 || longer > 48 * Math.max(stirrupDiaMm, 6) ? "Open Ties" : "U-Ties";
  }
  return "Cross Ties";
}

export type StirrupExtra = { role: "crosstie" | "diagonal-tie" | "open-tie" | "u-tie" | "group-tie"; shape: string; count: number; lengthEachMm: number };

export type StirrupResult =
  | { kind: "discrete"; count: number; lengthEachMm: number; resolvedTieType: ColumnTieType; extras: StirrupExtra[] }
  | { kind: "continuous"; totalLengthMm: number; resolvedTieType: ColumnTieType };

export function calculateColumnStirrups(input: {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  coverMm: number;
  diaMm: number;
  spacingMm: number;
  hookAngle: number;
  tieType: ColumnTieType | string;
  columnShape?: ColumnShape | string;
  mainBarCount?: number;
}): StirrupResult {
  const hookPerEnd = hookAllowancePerHook(input.hookAngle) * input.diaMm;
  const totalHookAllowance = 2 * hookPerEnd;
  const columnShape = input.columnShape ?? (input.widthMm === input.depthMm ? "Square" : "Rectangular");
  const resolved = resolveColumnTieType(
    input.tieType,
    columnShape,
    input.widthMm,
    input.depthMm,
    input.coverMm,
    input.diaMm,
    input.mainBarCount ?? 0,
  );

  if (resolved === "Spiral") {
    const di = input.widthMm - 2 * input.coverMm;
    const pitch = input.spacingMm;
    const lengthPerTurn = Math.sqrt((Math.PI * di) ** 2 + pitch ** 2);
    const turns = input.heightMm / pitch;
    return {
      kind: "continuous",
      totalLengthMm: turns * lengthPerTurn + totalHookAllowance,
      resolvedTieType: resolved,
    };
  }

  if (resolved === "Circular") {
    const di = input.widthMm - 2 * input.coverMm;
    return {
      kind: "discrete",
      count: barCount(input.heightMm, input.spacingMm),
      lengthEachMm: Math.PI * di + totalHookAllowance,
      resolvedTieType: resolved,
      extras: [],
    };
  }

  const b = input.widthMm - 2 * input.coverMm;
  const h = input.depthMm - 2 * input.coverMm;
  const lengthEach = closedLinkCuttingLengthMm(b, h, input.diaMm, input.hookAngle);
  const sets = barCount(input.heightMm, input.spacingMm);
  const multiplier = resolved === "Double Tie" ? 2 : 1;

  // Peripheral closed stirrup + intermediate ties per Cl. 26.5.3.2 — port
  // of Engine.cpp's push_column_ties(). "Closed+Crosstie" deliberately
  // shares Cross Ties' own generation (see ColumnTieType's header note).
  const extras: StirrupExtra[] = [];
  if (resolved === "Cross Ties" || resolved === "Closed+Crosstie") {
    extras.push(
      { role: "crosstie", shape: "cross-tie", count: sets, lengthEachMm: hookedLegCuttingLengthMm(b, input.diaMm, input.hookAngle) },
      { role: "crosstie", shape: "cross-tie", count: sets, lengthEachMm: hookedLegCuttingLengthMm(h, input.diaMm, input.hookAngle) },
    );
  } else if (resolved === "Diagonal Ties") {
    const diagClear = 2 * Math.sqrt(b * b + h * h);
    extras.push({ role: "diagonal-tie", shape: "diagonal-tie", count: sets, lengthEachMm: hookedLegCuttingLengthMm(diagClear, input.diaMm, input.hookAngle) });
  } else if (resolved === "Open Ties") {
    const openClear = h + totalHookAllowance;
    extras.push({ role: "open-tie", shape: "open-tie", count: 2 * sets, lengthEachMm: hookedLegCuttingLengthMm(openClear, input.diaMm, input.hookAngle) });
  } else if (resolved === "U-Ties") {
    const uClear = h + 0.3 * b;
    extras.push({ role: "u-tie", shape: "u-tie", count: 2 * sets, lengthEachMm: hookedLegCuttingLengthMm(uClear, input.diaMm, input.hookAngle) });
  } else if (resolved === "Group Ties") {
    const g = 0.35 * (b + h);
    extras.push({ role: "group-tie", shape: "group-tie", count: 4 * sets, lengthEachMm: closedLinkCuttingLengthMm(g, g, input.diaMm, input.hookAngle) });
  }

  return {
    kind: "discrete",
    count: sets,
    lengthEachMm: multiplier * lengthEach,
    resolvedTieType: resolved,
    extras,
  };
}

export function calculateColumnMainBarLength(heightMm: number): number {
  return heightMm;
}

// ── Beam ─────────────────────────────────────────────────────────────────────

export function calculateBeamStirrups(input: {
  widthMm: number;
  depthMm: number;
  coverMm: number;
  diaMm: number;
  spacingSupportMm: number;
  spacingMiddleMm: number;
  legs: number;
  hookAngle: number;
  spanMm: number;
}): {
  count: number;
  lengthEachMm: number;
  crosstieCount: number;
  crosstieLengthMm: number;
} {
  const b = input.widthMm - 2 * input.coverMm;
  const h = input.depthMm - 2 * input.coverMm;
  const lengthEach = closedLinkCuttingLengthMm(b, h, input.diaMm, input.hookAngle);

  const effectiveDepth = input.depthMm - input.coverMm;
  const supportZoneLen = 2 * effectiveDepth;
  const countSupportZone = barCount(supportZoneLen, input.spacingSupportMm);
  const middleLen = input.spanMm - 2 * supportZoneLen;
  const countMiddle =
    middleLen > 0 ? barCount(middleLen, input.spacingMiddleMm) : 0;
  const totalCount = 2 * countSupportZone + countMiddle;

  if (input.legs === 4) {
    return {
      count: totalCount,
      lengthEachMm: lengthEach,
      crosstieCount: totalCount,
      crosstieLengthMm: hookedLegCuttingLengthMm(h, input.diaMm, input.hookAngle),
    };
  }
  return {
    count: totalCount,
    lengthEachMm: lengthEach,
    crosstieCount: 0,
    crosstieLengthMm: 0,
  };
}

export function calculateBeamMainBarLength(input: {
  spanMm: number;
  diaMm: number;
  concreteGrade: ConcreteGrade | string;
  steelGrade: SteelGrade | string;
  position: "Top" | "Bottom";
  topBarType: BeamTopBarType | string;
}): number {
  const ld = developmentLengthMm(input.diaMm, input.concreteGrade, input.steelGrade);
  if (input.position === "Top" && input.topBarType === "At Support") {
    return ld + 0.3 * input.spanMm;
  }
  return input.spanMm + 2 * ld;
}

// ── Slab ─────────────────────────────────────────────────────────────────────

export function calculateSlabMainBarLength(
  spanMm: number,
  diaMm: number,
  concreteGrade: ConcreteGrade | string,
  steelGrade: SteelGrade | string,
): number {
  return spanMm + 2 * developmentLengthMm(diaMm, concreteGrade, steelGrade);
}

export function calculateSlabDistributionBarLength(
  spanMm: number,
  coverMm: number,
): number {
  return spanMm - 2 * coverMm;
}

/** IS 456 Cl. 26.5.2.1 — mild steel 0.15 %, HYSD 0.12 %. */
export function getMinSteelPercent(steelGrade: SteelGrade | string): number {
  return String(steelGrade).trim() === "Fe250" ? 0.15 : 0.12;
}

export function calculateAstProvided(diaMm: number, spacingMm: number): number {
  if (spacingMm <= 0) return 0;
  return (Math.PI / 4) * diaMm * diaMm * (1000 / spacingMm);
}

export function calculateAstMin(
  thicknessMm: number,
  steelGrade: SteelGrade | string,
): number {
  return (getMinSteelPercent(steelGrade) / 100) * 1000 * thicknessMm;
}

// ── Footing ──────────────────────────────────────────────────────────────────

export function calculateFootingBarLength(dimMm: number, coverMm: number): number {
  return dimMm - 2 * coverMm;
}

export function calculateAvailableAnchorage(
  footingDimMm: number,
  columnDimMm: number,
  coverMm: number,
): number {
  return (footingDimMm - columnDimMm) / 2 - coverMm;
}

// ── Wall (retaining wall) ────────────────────────────────────────────────────
// Port of Engine.cpp's generate_wall_bbs() — a cantilever retaining wall's
// stem (vertical + horizontal distribution, both faces) + base (mesh both
// ways) + shear links, quantity-estimate only (not a design check).

/** Stem vertical bar length — embeds into the base when one exists. */
export function calculateWallStemVerticalLength(
  stemHeightMm: number,
  coverMm: number,
  baseThicknessMm?: number,
): number {
  let len = stemHeightMm - coverMm;
  if (baseThicknessMm && baseThicknessMm > 0) {
    len += Math.min(baseThicknessMm - coverMm, baseThicknessMm);
  }
  return len;
}

export function calculateWallStemHorizontalLength(wallLengthMm: number, coverMm: number): number {
  return wallLengthMm - 2 * coverMm;
}

export function calculateWallBaseLengthwiseLength(wallLengthMm: number, coverMm: number): number {
  return wallLengthMm - 2 * coverMm;
}

export function calculateWallBaseAcrossLength(baseWidthMm: number, coverMm: number): number {
  return baseWidthMm - 2 * coverMm;
}

/** heel + toe + stem thickness = total base width. */
export function calculateWallBaseWidth(heelMm: number, toeMm: number, stemThicknessMm: number): number {
  return heelMm + toeMm + stemThicknessMm;
}

/**
 * IS 2502 closed rectangular link/stirrup cutting length — perimeter + hooks
 * − bend deductions at each corner. Port of Engine.cpp's closed_link_cutting().
 * Used for wall shear links, and (2026-09-08) for Column/Beam stirrups too —
 * see this file's header comment for the reconciliation account.
 */
export function closedLinkCuttingLengthMm(
  aMm: number,
  bMm: number,
  diaMm: number,
  hookAngle: number,
): number {
  const hookPerHook = hookAllowancePerHook(hookAngle) * diaMm;
  const hooks = 2 * hookPerHook;
  // 3×90° corners + 2×135° hook bends (≈12d) for 135°/180° hooks; five 90°
  // bends (≈10d) otherwise — bend deduction factors ×d: 90°→2d, 135°→3d.
  const deduct = hookAngle >= 135 ? (3 * 2 + 2 * 3) * diaMm : 5 * 2 * diaMm;
  return Math.max(0, 2 * (aMm + bMm) + hooks - deduct);
}

/** Straight crosstie / open leg with two end hooks — port of hooked_leg_cutting(). */
export function hookedLegCuttingLengthMm(clearMm: number, diaMm: number, hookAngle: number): number {
  const hookPerHook = hookAllowancePerHook(hookAngle) * diaMm;
  const hooks = 2 * hookPerHook;
  const bendAngle = hookAngle >= 135 ? 135 : 90;
  const deduct = 2 * (bendAngle === 90 ? 2 : 3) * diaMm;
  return Math.max(0, clearMm + hooks - deduct);
}

// ── Stair ────────────────────────────────────────────────────────────────────
// Port of Engine.cpp's generate_stair_bbs() — waist-slab main/distribution
// bars plus two-way landing mesh, quantity-estimate only.

/** Waist slope length: √((goingTotal)² + (riseTotal)²). */
export function calculateStairSlopeLengthMm(goingTotalMm: number, riseTotalMm: number): number {
  return Math.sqrt(goingTotalMm * goingTotalMm + riseTotalMm * riseTotalMm);
}

/** Main bars run along the slope and develop Ld into each landing. */
export function calculateStairMainBarLength(
  slopeMm: number,
  diaMm: number,
  concreteGrade: ConcreteGrade | string,
  steelGrade: SteelGrade | string,
): number {
  return slopeMm + 2 * developmentLengthMm(diaMm, concreteGrade, steelGrade);
}

export function calculateStairDistBarLength(flightWidthMm: number, coverMm: number): number {
  return Math.max(0, flightWidthMm - 2 * coverMm);
}

// ── Zod input schemas ────────────────────────────────────────────────────────

export const BbsDiaCount = z.object({
  diaMm: z.number().positive(),
  count: z.number().int().nonnegative(),
});

export const BbsColumnInput = z.object({
  mark: z.string().max(80).optional(),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  heightMm: z.number().positive(),
  coverMm: z.number().nonnegative(),
  stirrupDiaMm: z.number().positive(),
  spacingMm: z.number().positive(),
  hookAngle: HookAngle.default(135),
  tieType: ColumnTieType.default("Closed"),
  columnShape: ColumnShape.default("Rectangular"),
  mainBars: z.array(BbsDiaCount).default([]),
});
export type BbsColumnInput = z.infer<typeof BbsColumnInput>;

export const BbsBeamInput = z.object({
  mark: z.string().max(80).optional(),
  clearSpanMm: z.number().positive(),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  coverMm: z.number().nonnegative(),
  concreteGrade: ConcreteGrade.default("M20"),
  steelGrade: SteelGrade.default("Fe415"),
  stirrupDiaMm: z.number().positive(),
  spacingSupportMm: z.number().positive(),
  spacingMiddleMm: z.number().positive(),
  stirrupLegs: z.union([z.literal(2), z.literal(4)]).default(2),
  hookAngle: HookAngle.default(135),
  topBarType: BeamTopBarType.default("Full Span"),
  topBars: z.array(BbsDiaCount).default([]),
  bottomBars: z.array(BbsDiaCount).default([]),
});
export type BbsBeamInput = z.infer<typeof BbsBeamInput>;

export const BbsSlabInput = z.object({
  mark: z.string().max(80).optional(),
  spanXMm: z.number().positive(),
  spanYMm: z.number().positive(),
  thicknessMm: z.number().positive(),
  coverMm: z.number().nonnegative(),
  concreteGrade: ConcreteGrade.default("M20"),
  steelGrade: SteelGrade.default("Fe415"),
  slabType: SlabType.default("One-Way"),
  diaXMm: z.number().positive(),
  spacingXMm: z.number().positive(),
  diaYMm: z.number().positive(),
  spacingYMm: z.number().positive(),
});
export type BbsSlabInput = z.infer<typeof BbsSlabInput>;

export const BbsFootingInput = z.object({
  mark: z.string().max(80).optional(),
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  columnLengthMm: z.number().positive(),
  columnWidthMm: z.number().positive(),
  depthMm: z.number().positive(),
  coverMm: z.number().nonnegative(),
  concreteGrade: ConcreteGrade.default("M20"),
  steelGrade: SteelGrade.default("Fe415"),
  diaLMm: z.number().positive(),
  spacingLMm: z.number().positive(),
  diaBMm: z.number().positive(),
  spacingBMm: z.number().positive(),
});
export type BbsFootingInput = z.infer<typeof BbsFootingInput>;

export const BbsWallInput = z.object({
  mark: z.string().max(80).optional(),
  wallLengthMm: z.number().positive(),
  stemHeightMm: z.number().positive(),
  stemThicknessMm: z.number().positive(),
  heelMm: z.number().nonnegative().default(0),
  toeMm: z.number().nonnegative().default(0),
  baseThicknessMm: z.number().nonnegative().default(0),
  coverMm: z.number().nonnegative(),
  concreteGrade: ConcreteGrade.default("M20"),
  steelGrade: SteelGrade.default("Fe415"),
  tensionFace: z.enum(["Front", "Back"]).default("Front"),
  stemVDiaMm: z.number().nonnegative().default(0),
  stemVSpacingMm: z.number().nonnegative().default(0),
  stemVBackDiaMm: z.number().nonnegative().default(0),
  stemVBackSpacingMm: z.number().nonnegative().default(0),
  stemHDiaMm: z.number().nonnegative().default(0),
  stemHSpacingMm: z.number().nonnegative().default(0),
  baseLDiaMm: z.number().nonnegative().default(0),
  baseLSpacingMm: z.number().nonnegative().default(0),
  baseBDiaMm: z.number().nonnegative().default(0),
  baseBSpacingMm: z.number().nonnegative().default(0),
  linkDiaMm: z.number().nonnegative().default(0),
  linkSpacingMm: z.number().nonnegative().default(0),
  linkLegs: z.union([z.literal(2), z.literal(4)]).default(2),
  hookAngle: HookAngle.default(135),
});
export type BbsWallInput = z.infer<typeof BbsWallInput>;

export const BbsStairInput = z.object({
  mark: z.string().max(80).optional(),
  nRisers: z.number().int().positive(),
  nFlights: z.number().int().positive().default(1),
  goingMm: z.number().positive(),
  riserMm: z.number().positive(),
  waistThicknessMm: z.number().positive(),
  flightWidthMm: z.number().positive(),
  coverMm: z.number().nonnegative(),
  landingLengthMm: z.number().nonnegative().default(0),
  landingWidthMm: z.number().nonnegative().default(0),
  concreteGrade: ConcreteGrade.default("M20"),
  steelGrade: SteelGrade.default("Fe415"),
  mainDiaMm: z.number().nonnegative().default(0),
  mainSpacingMm: z.number().nonnegative().default(0),
  distDiaMm: z.number().nonnegative().default(0),
  distSpacingMm: z.number().nonnegative().default(0),
  landingDiaMm: z.number().nonnegative().default(0),
  landingSpacingMm: z.number().nonnegative().default(0),
});
export type BbsStairInput = z.infer<typeof BbsStairInput>;

export const BbsMemberCreate = z.discriminatedUnion("element", [
  z.object({ bbsId: z.string().uuid(), element: z.literal("COLUMN"), input: BbsColumnInput }),
  z.object({ bbsId: z.string().uuid(), element: z.literal("BEAM"), input: BbsBeamInput }),
  z.object({ bbsId: z.string().uuid(), element: z.literal("SLAB"), input: BbsSlabInput }),
  z.object({ bbsId: z.string().uuid(), element: z.literal("FOOTING"), input: BbsFootingInput }),
  z.object({ bbsId: z.string().uuid(), element: z.literal("WALL"), input: BbsWallInput }),
  z.object({ bbsId: z.string().uuid(), element: z.literal("STAIR"), input: BbsStairInput }),
]);
export type BbsMemberCreate = z.infer<typeof BbsMemberCreate>;

export const BbsMemberUpdate = z.object({
  id: z.string().uuid(),
  input: z.union([BbsColumnInput, BbsBeamInput, BbsSlabInput, BbsFootingInput, BbsWallInput, BbsStairInput]),
});
export type BbsMemberUpdate = z.infer<typeof BbsMemberUpdate>;
