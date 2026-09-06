/**
 * BBS member engine — geometry → schedule bar lines + advisory checks.
 * Ported verbatim from packages/contracts/src/bbs-engine.ts (live, tested
 * code backing the old backend's `bbs.addMember`/`regenerateMember`
 * procedures) — only the import path changes (`./bbs.js` → `./formulas`,
 * since `web/` doesn't depend on packages/contracts). See
 * web/lib/bbs/formulas.ts's header note for the porting rationale and scope
 * (Column/Beam/Slab/Footing only — Wall/Stair are a follow-up).
 */
import {
  type BbsBeamInput,
  type BbsColumnInput,
  type BbsElement,
  type BbsFootingInput,
  type BbsSlabInput,
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
  developmentLengthMm,
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
  | "mesh-B";

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

export type BbsMemberStored =
  | { element: "COLUMN"; input: BbsColumnInput }
  | { element: "BEAM"; input: BbsBeamInput }
  | { element: "SLAB"; input: BbsSlabInput }
  | { element: "FOOTING"; input: BbsFootingInput };

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
  }
}
