/**
 * BBS member engine — geometry → schedule bar lines + advisory checks.
 * Column/Beam/Slab/Footing ported verbatim from packages/contracts/src/
 * bbs-engine.ts; Wall/Stair ported from HolagundiWorks/AQC's C++ engine
 * (`BBSDesktop/src/core/Engine.cpp`'s `generate_wall_bbs`/
 * `generate_stair_bbs`) — see web/lib/bbs/formulas.ts's header note for
 * the full account of what's ported vs. what's flagged as a known
 * discrepancy between the two engines' Column/Beam formulas.
 */
import {
  type BbsBeamInput,
  type BbsColumnInput,
  type BbsElement,
  type BbsFootingInput,
  type BbsSlabInput,
  type BbsStairInput,
  type BbsWallInput,
  barCount,
  bbsItemTotals,
  calculateAvailableAnchorage,
  calculateAstMin,
  calculateAstProvided,
  calculateBeamMainBarLength,
  calculateBeamStirrups,
  calculateColumnMainBarLength,
  calculateColumnStirrups,
  calculateFootingBarLength,
  calculateSlabDistributionBarLength,
  calculateSlabMainBarLength,
  calculateStairDistBarLength,
  calculateStairMainBarLength,
  calculateStairSlopeLengthMm,
  calculateWallBaseAcrossLength,
  calculateWallBaseLengthwiseLength,
  calculateWallBaseWidth,
  calculateWallStemHorizontalLength,
  calculateWallStemVerticalLength,
  closedLinkCuttingLengthMm,
  developmentLengthMm,
  hookedLegCuttingLengthMm,
} from "./formulas";

export type BbsBarRole =
  | "main"
  | "top"
  | "bottom"
  | "stirrup"
  | "crosstie"
  | "tie"
  | "distribution"
  | "mesh-L"
  | "mesh-B"
  | "stem-v-front"
  | "stem-v-back"
  | "stem-h"
  | "base-l"
  | "base-b"
  | "link"
  | "landing-l"
  | "landing-b";

export interface BbsBarLine {
  barMark: string;
  member: string;
  element: BbsElement;
  role: BbsBarRole;
  diaMm: number;
  noOfMembers: number;
  barsPerMember: number;
  cuttingLengthMm: number;
  weightKg: number;
  shape: string;
}

export interface BbsCheckRow {
  mark: string;
  label: string;
  value: number;
  limit: number;
  ok: boolean;
  message: string;
}

export interface BbsMemberResult {
  element: BbsElement;
  mark: string;
  bars: BbsBarLine[];
  checks: BbsCheckRow[];
  totalWeightKg: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function markOf(input: { mark?: string | undefined }, fallback: string): string {
  return input.mark?.trim() || fallback;
}

function line(
  barMark: string,
  member: string,
  element: BbsElement,
  role: BbsBarRole,
  diaMm: number,
  barsPerMember: number,
  cuttingLengthMm: number,
  shape: string,
  noOfMembers = 1,
): BbsBarLine {
  const cutting = round2(cuttingLengthMm);
  const { weightKg } = bbsItemTotals({
    diaMm,
    noOfMembers,
    barsPerMember,
    cuttingLengthMm: cutting,
  });
  return {
    barMark,
    member,
    element,
    role,
    diaMm,
    noOfMembers,
    barsPerMember,
    cuttingLengthMm: cutting,
    weightKg,
    shape,
  };
}

export function computeColumnMember(
  input: BbsColumnInput,
  index = 0,
): BbsMemberResult {
  const mark = markOf(input, `C${index + 1}`);
  const bars: BbsBarLine[] = [];
  let n = 1;

  const stirrup = calculateColumnStirrups({
    widthMm: input.widthMm,
    depthMm: input.depthMm,
    heightMm: input.heightMm,
    coverMm: input.coverMm,
    diaMm: input.stirrupDiaMm,
    spacingMm: input.spacingMm,
    hookAngle: input.hookAngle,
    tieType: input.tieType,
  });

  if (stirrup.kind === "continuous") {
    bars.push(
      line(
        `${mark}-T${n++}`,
        mark,
        "COLUMN",
        "tie",
        input.stirrupDiaMm,
        1,
        stirrup.totalLengthMm,
        "spiral",
      ),
    );
  } else {
    bars.push(
      line(
        `${mark}-T${n++}`,
        mark,
        "COLUMN",
        "tie",
        input.stirrupDiaMm,
        stirrup.count,
        stirrup.lengthEachMm,
        input.tieType === "Circular" ? "circular-tie" : "closed-tie",
      ),
    );
  }

  const mainLen = calculateColumnMainBarLength(input.heightMm);
  for (const mb of input.mainBars) {
    if (mb.count <= 0) continue;
    bars.push(
      line(
        `${mark}-M${n++}`,
        mark,
        "COLUMN",
        "main",
        mb.diaMm,
        mb.count,
        mainLen,
        "straight",
      ),
    );
  }

  return {
    element: "COLUMN",
    mark,
    bars,
    checks: [],
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

export function computeBeamMember(input: BbsBeamInput, index = 0): BbsMemberResult {
  const mark = markOf(input, `B${index + 1}`);
  const bars: BbsBarLine[] = [];
  let n = 1;

  const stirrup = calculateBeamStirrups({
    widthMm: input.widthMm,
    depthMm: input.depthMm,
    coverMm: input.coverMm,
    diaMm: input.stirrupDiaMm,
    spacingSupportMm: input.spacingSupportMm,
    spacingMiddleMm: input.spacingMiddleMm,
    legs: input.stirrupLegs,
    hookAngle: input.hookAngle,
    spanMm: input.clearSpanMm,
  });

  bars.push(
    line(
      `${mark}-S${n++}`,
      mark,
      "BEAM",
      "stirrup",
      input.stirrupDiaMm,
      stirrup.count,
      stirrup.lengthEachMm,
      "stirrup",
    ),
  );
  if (stirrup.crosstieCount > 0) {
    bars.push(
      line(
        `${mark}-X${n++}`,
        mark,
        "BEAM",
        "crosstie",
        input.stirrupDiaMm,
        stirrup.crosstieCount,
        stirrup.crosstieLengthMm,
        "crosstie",
      ),
    );
  }

  for (const tb of input.topBars) {
    if (tb.count <= 0) continue;
    const topLen = calculateBeamMainBarLength({
      spanMm: input.clearSpanMm,
      diaMm: tb.diaMm,
      concreteGrade: input.concreteGrade,
      steelGrade: input.steelGrade,
      position: "Top",
      topBarType: input.topBarType,
    });
    const physical = input.topBarType === "At Support" ? tb.count * 2 : tb.count;
    bars.push(
      line(
        `${mark}-T${n++}`,
        mark,
        "BEAM",
        "top",
        tb.diaMm,
        physical,
        topLen,
        input.topBarType === "At Support" ? "top-at-support" : "full-span",
      ),
    );
  }

  for (const bb of input.bottomBars) {
    if (bb.count <= 0) continue;
    const botLen = calculateBeamMainBarLength({
      spanMm: input.clearSpanMm,
      diaMm: bb.diaMm,
      concreteGrade: input.concreteGrade,
      steelGrade: input.steelGrade,
      position: "Bottom",
      topBarType: input.topBarType,
    });
    bars.push(
      line(
        `${mark}-B${n++}`,
        mark,
        "BEAM",
        "bottom",
        bb.diaMm,
        bb.count,
        botLen,
        "full-span",
      ),
    );
  }

  return {
    element: "BEAM",
    mark,
    bars,
    checks: [],
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

export function computeSlabMember(input: BbsSlabInput, index = 0): BbsMemberResult {
  const mark = markOf(input, `S${index + 1}`);
  const bars: BbsBarLine[] = [];

  const lenX = calculateSlabMainBarLength(
    input.spanXMm,
    input.diaXMm,
    input.concreteGrade,
    input.steelGrade,
  );
  bars.push(
    line(
      `${mark}-X`,
      mark,
      "SLAB",
      "main",
      input.diaXMm,
      barCount(input.spanYMm, input.spacingXMm),
      lenX,
      "main-X",
    ),
  );

  const lenY =
    input.slabType === "Two-Way"
      ? calculateSlabMainBarLength(
          input.spanYMm,
          input.diaYMm,
          input.concreteGrade,
          input.steelGrade,
        )
      : calculateSlabDistributionBarLength(input.spanYMm, input.coverMm);
  bars.push(
    line(
      `${mark}-Y`,
      mark,
      "SLAB",
      input.slabType === "Two-Way" ? "main" : "distribution",
      input.diaYMm,
      barCount(input.spanXMm, input.spacingYMm),
      lenY,
      input.slabType === "Two-Way" ? "main-Y" : "distribution-Y",
    ),
  );

  const astMin = calculateAstMin(input.thicknessMm, input.steelGrade);
  const astProvX = calculateAstProvided(input.diaXMm, input.spacingXMm);
  const astProvY = calculateAstProvided(input.diaYMm, input.spacingYMm);
  const checks: BbsCheckRow[] = [
    {
      mark,
      label: "Ast X (mm²/m)",
      value: round2(astProvX),
      limit: round2(astMin),
      ok: astProvX >= astMin,
      message: astProvX >= astMin ? "OK" : "Increase steel / reduce spacing",
    },
    {
      mark,
      label: "Ast Y (mm²/m)",
      value: round2(astProvY),
      limit: round2(astMin),
      ok: astProvY >= astMin,
      message: astProvY >= astMin ? "OK" : "Increase steel / reduce spacing",
    },
  ];

  return {
    element: "SLAB",
    mark,
    bars,
    checks,
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

export function computeFootingMember(
  input: BbsFootingInput,
  index = 0,
): BbsMemberResult {
  const mark = markOf(input, `F${index + 1}`);
  const bars: BbsBarLine[] = [];

  bars.push(
    line(
      `${mark}-L`,
      mark,
      "FOOTING",
      "mesh-L",
      input.diaLMm,
      barCount(input.widthMm, input.spacingLMm),
      calculateFootingBarLength(input.lengthMm, input.coverMm),
      "straight",
    ),
  );
  bars.push(
    line(
      `${mark}-B`,
      mark,
      "FOOTING",
      "mesh-B",
      input.diaBMm,
      barCount(input.lengthMm, input.spacingBMm),
      calculateFootingBarLength(input.widthMm, input.coverMm),
      "straight",
    ),
  );

  const ldL = developmentLengthMm(input.diaLMm, input.concreteGrade, input.steelGrade);
  const availL = calculateAvailableAnchorage(
    input.lengthMm,
    input.columnLengthMm,
    input.coverMm,
  );
  const ldB = developmentLengthMm(input.diaBMm, input.concreteGrade, input.steelGrade);
  const availB = calculateAvailableAnchorage(
    input.widthMm,
    input.columnWidthMm,
    input.coverMm,
  );
  const astMin = calculateAstMin(input.depthMm, input.steelGrade);
  const astProvL = calculateAstProvided(input.diaLMm, input.spacingLMm);
  const astProvB = calculateAstProvided(input.diaBMm, input.spacingBMm);

  const checks: BbsCheckRow[] = [
    {
      mark,
      label: "Anchorage L (mm)",
      value: round2(availL),
      limit: round2(ldL),
      ok: availL >= ldL,
      message: availL >= ldL ? "OK" : "Insufficient — add hook or rework",
    },
    {
      mark,
      label: "Anchorage B (mm)",
      value: round2(availB),
      limit: round2(ldB),
      ok: availB >= ldB,
      message: availB >= ldB ? "OK" : "Insufficient — add hook or rework",
    },
    {
      mark,
      label: "Ast L (mm²/m)",
      value: round2(astProvL),
      limit: round2(astMin),
      ok: astProvL >= astMin,
      message: astProvL >= astMin ? "OK" : "Increase steel / reduce spacing",
    },
    {
      mark,
      label: "Ast B (mm²/m)",
      value: round2(astProvB),
      limit: round2(astMin),
      ok: astProvB >= astMin,
      message: astProvB >= astMin ? "OK" : "Increase steel / reduce spacing",
    },
  ];

  return {
    element: "FOOTING",
    mark,
    bars,
    checks,
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

/** Cantilever retaining wall — port of Engine.cpp's generate_wall_bbs(). */
export function computeWallMember(input: BbsWallInput, index = 0): BbsMemberResult {
  const mark = markOf(input, `W${index + 1}`);
  const bars: BbsBarLine[] = [];
  const baseWidth = calculateWallBaseWidth(input.heelMm, input.toeMm, input.stemThicknessMm);

  if (input.stemVDiaMm > 0 && input.stemVSpacingMm > 0) {
    const len = calculateWallStemVerticalLength(input.stemHeightMm, input.coverMm, input.baseThicknessMm);
    const nos = barCount(input.wallLengthMm, input.stemVSpacingMm);
    const role: BbsBarRole = input.tensionFace === "Back" ? "stem-v-back" : "stem-v-front";
    bars.push(line(`${mark}-SV`, mark, "WALL", role, input.stemVDiaMm, nos, len, "straight"));
  }
  if (input.stemVBackDiaMm > 0 && input.stemVBackSpacingMm > 0) {
    const len = input.stemHeightMm - input.coverMm;
    const nos = barCount(input.wallLengthMm, input.stemVBackSpacingMm);
    const role: BbsBarRole = input.tensionFace === "Back" ? "stem-v-front" : "stem-v-back";
    bars.push(line(`${mark}-SVB`, mark, "WALL", role, input.stemVBackDiaMm, nos, len, "straight"));
  }
  if (input.stemHDiaMm > 0 && input.stemHSpacingMm > 0) {
    const len = calculateWallStemHorizontalLength(input.wallLengthMm, input.coverMm);
    const nos = barCount(input.stemHeightMm, input.stemHSpacingMm);
    bars.push(line(`${mark}-SH`, mark, "WALL", "stem-h", input.stemHDiaMm, nos, len, "straight"));
  }
  if (baseWidth > 0 && input.baseThicknessMm > 0) {
    if (input.baseLDiaMm > 0 && input.baseLSpacingMm > 0) {
      const len = calculateWallBaseLengthwiseLength(input.wallLengthMm, input.coverMm);
      const nos = barCount(baseWidth, input.baseLSpacingMm);
      bars.push(line(`${mark}-BL`, mark, "WALL", "base-l", input.baseLDiaMm, nos, len, "straight"));
    }
    if (input.baseBDiaMm > 0 && input.baseBSpacingMm > 0) {
      const len = calculateWallBaseAcrossLength(baseWidth, input.coverMm);
      const nos = barCount(input.wallLengthMm, input.baseBSpacingMm);
      bars.push(line(`${mark}-BB`, mark, "WALL", "base-b", input.baseBDiaMm, nos, len, "straight"));
    }
  }
  if (input.linkDiaMm > 0 && input.linkSpacingMm > 0) {
    const bClear = Math.max(0, input.stemThicknessMm - 2 * input.coverMm);
    const hClear = 100; // matches Engine.cpp's fixed 100mm h-clear for wall shear links
    let lengthEach = closedLinkCuttingLengthMm(bClear, hClear, input.linkDiaMm, input.hookAngle);
    if (input.linkLegs >= 4) lengthEach += hookedLegCuttingLengthMm(hClear, input.linkDiaMm, input.hookAngle);
    const along = input.stemVSpacingMm > 0 ? input.stemVSpacingMm : input.linkSpacingMm;
    const nos = barCount(input.stemHeightMm, input.linkSpacingMm) * barCount(input.wallLengthMm, along);
    bars.push(line(`${mark}-LK`, mark, "WALL", "link", input.linkDiaMm, nos, lengthEach, "closed-tie"));
  }

  const astMinStem = calculateAstMin(input.stemThicknessMm, input.steelGrade);
  const astProvStem = calculateAstProvided(input.stemVDiaMm, input.stemVSpacingMm);
  const astMinBase = input.baseThicknessMm > 0 ? calculateAstMin(input.baseThicknessMm, input.steelGrade) : 0;
  const baseDia = input.baseLDiaMm > 0 ? input.baseLDiaMm : input.baseBDiaMm;
  const baseSpacing = input.baseLSpacingMm > 0 ? input.baseLSpacingMm : input.baseBSpacingMm;
  const astProvBase = calculateAstProvided(baseDia, baseSpacing);

  const checks: BbsCheckRow[] = [
    {
      mark,
      label: "Ast stem (mm²/m)",
      value: round2(astProvStem),
      limit: round2(astMinStem),
      ok: astProvStem >= astMinStem,
      message: astProvStem >= astMinStem ? "OK" : "Increase stem steel / reduce spacing",
    },
    {
      mark,
      label: "Ast base (mm²/m)",
      value: round2(astProvBase),
      limit: round2(astMinBase),
      ok: input.baseThicknessMm <= 0 || astProvBase >= astMinBase,
      message:
        input.baseThicknessMm <= 0
          ? "N/A"
          : astProvBase >= astMinBase
            ? "OK"
            : "Increase base steel / reduce spacing",
    },
  ];

  return {
    element: "WALL",
    mark,
    bars,
    checks,
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

/** Staircase waist slab + landings — port of Engine.cpp's generate_stair_bbs(). */
export function computeStairMember(input: BbsStairInput, index = 0): BbsMemberResult {
  const mark = markOf(input, `ST${index + 1}`);
  const bars: BbsBarLine[] = [];
  const flights = Math.max(1, input.nFlights);

  const goingTotal = (input.nRisers - 1) * input.goingMm;
  const riseTotal = input.nRisers * input.riserMm;
  const slope = calculateStairSlopeLengthMm(goingTotal, riseTotal);
  const landingWidth = input.landingWidthMm > 0 ? input.landingWidthMm : input.flightWidthMm;

  if (input.mainDiaMm > 0 && input.mainSpacingMm > 0) {
    const len = calculateStairMainBarLength(slope, input.mainDiaMm, input.concreteGrade, input.steelGrade);
    const nos = barCount(input.flightWidthMm, input.mainSpacingMm) * flights;
    bars.push(line(`${mark}-M`, mark, "STAIR", "main", input.mainDiaMm, nos, len, "straight"));
  }
  if (input.distDiaMm > 0 && input.distSpacingMm > 0) {
    const len = calculateStairDistBarLength(input.flightWidthMm, input.coverMm);
    const nos = barCount(slope, input.distSpacingMm) * flights;
    bars.push(line(`${mark}-D`, mark, "STAIR", "distribution", input.distDiaMm, nos, len, "straight"));
  }
  if (input.landingDiaMm > 0 && input.landingSpacingMm > 0 && input.landingLengthMm > 0) {
    const lenAlong = Math.max(0, input.landingLengthMm - 2 * input.coverMm);
    const lenAcross = Math.max(0, landingWidth - 2 * input.coverMm);
    const nosAlong = barCount(landingWidth, input.landingSpacingMm);
    const nosAcross = barCount(input.landingLengthMm, input.landingSpacingMm);
    const landings = 2 * flights; // top + bottom landing per flight
    bars.push(line(`${mark}-LL`, mark, "STAIR", "landing-l", input.landingDiaMm, nosAlong * landings, lenAlong, "straight"));
    bars.push(line(`${mark}-LB`, mark, "STAIR", "landing-b", input.landingDiaMm, nosAcross * landings, lenAcross, "straight"));
  }

  const astMain = calculateAstProvided(input.mainDiaMm, input.mainSpacingMm);
  const astMin = calculateAstMin(input.waistThicknessMm, input.steelGrade);
  const checks: BbsCheckRow[] = [
    {
      mark,
      label: "Ast main (mm²/m)",
      value: round2(astMain),
      limit: round2(astMin),
      ok: input.mainDiaMm <= 0 || astMain >= astMin,
      message: input.mainDiaMm <= 0 ? "N/A" : astMain >= astMin ? "OK" : "Increase main steel / reduce spacing",
    },
  ];

  return {
    element: "STAIR",
    mark,
    bars,
    checks,
    totalWeightKg: round2(bars.reduce((s, b) => s + b.weightKg, 0)),
  };
}

export type BbsMemberStored =
  | { element: "COLUMN"; input: BbsColumnInput }
  | { element: "BEAM"; input: BbsBeamInput }
  | { element: "SLAB"; input: BbsSlabInput }
  | { element: "FOOTING"; input: BbsFootingInput }
  | { element: "WALL"; input: BbsWallInput }
  | { element: "STAIR"; input: BbsStairInput };

export function computeMember(
  stored: BbsMemberStored,
  index = 0,
): BbsMemberResult {
  switch (stored.element) {
    case "COLUMN":
      return computeColumnMember(stored.input, index);
    case "BEAM":
      return computeBeamMember(stored.input, index);
    case "SLAB":
      return computeSlabMember(stored.input, index);
    case "FOOTING":
      return computeFootingMember(stored.input, index);
    case "WALL":
      return computeWallMember(stored.input, index);
    case "STAIR":
      return computeStairMember(stored.input, index);
  }
}
