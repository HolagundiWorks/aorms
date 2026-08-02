import { describe, expect, it } from "vitest";
import {
  barCount,
  barUnitWeightKgM,
  bbsItemTotals,
  calculateAstMin,
  calculateAstProvided,
  calculateBeamMainBarLength,
  calculateColumnStirrups,
  calculateFootingBarLength,
  calculateSlabDistributionBarLength,
  developmentLengthMm,
  getMinSteelPercent,
  hookAllowancePerHook,
} from "./bbs.js";
import {
  computeBeamMember,
  computeColumnMember,
  computeFootingMember,
  computeSlabMember,
} from "./bbs-engine.js";

describe("bbs helpers", () => {
  it("unit weight d²/162", () => {
    expect(barUnitWeightKgM(12)).toBeCloseTo(0.888888, 5);
  });

  it("hook allowances", () => {
    expect(hookAllowancePerHook(90)).toBe(9);
    expect(hookAllowancePerHook(135)).toBe(12);
    expect(hookAllowancePerHook(180)).toBe(16);
  });

  it("development length IS 456", () => {
    expect(developmentLengthMm(12, "M20", "Fe415")).toBeCloseTo(564.140625, 4);
  });

  it("barCount and item totals", () => {
    expect(barCount(3000, 150)).toBe(21);
    const t = bbsItemTotals({
      diaMm: 12,
      noOfMembers: 1,
      barsPerMember: 6,
      cuttingLengthMm: 3000,
    });
    expect(t.totalBars).toBe(6);
    expect(t.totalLengthM).toBe(18);
    expect(t.weightKg).toBeCloseTo(18 * barUnitWeightKgM(12), 2);
  });
});

describe("column / beam / slab / footing", () => {
  it("closed column tie cutting length", () => {
    const r = calculateColumnStirrups({
      widthMm: 300,
      depthMm: 450,
      heightMm: 3000,
      coverMm: 40,
      diaMm: 8,
      spacingMm: 150,
      hookAngle: 135,
      tieType: "Closed",
    });
    expect(r.kind).toBe("discrete");
    if (r.kind === "discrete") {
      expect(r.lengthEachMm).toBe(1372);
      expect(r.count).toBe(21);
    }
  });

  it("beam top at-support uses Ld + 0.3L", () => {
    const ld = developmentLengthMm(12, "M20", "Fe415");
    const atSup = calculateBeamMainBarLength({
      spanMm: 5000,
      diaMm: 12,
      concreteGrade: "M20",
      steelGrade: "Fe415",
      position: "Top",
      topBarType: "At Support",
    });
    expect(atSup).toBeCloseTo(ld + 1500, 4);
  });

  it("slab distribution and Ast", () => {
    expect(calculateSlabDistributionBarLength(4000, 20)).toBe(3960);
    expect(getMinSteelPercent("Fe250")).toBe(0.15);
    expect(calculateAstMin(150, "Fe415")).toBeCloseTo(180, 5);
    expect(calculateAstProvided(10, 150)).toBeCloseTo(523.598775, 3);
  });

  it("footing straight length", () => {
    expect(calculateFootingBarLength(2000, 50)).toBe(1900);
  });
});

describe("member engine", () => {
  it("column → schedule lines", () => {
    const r = computeColumnMember({
      mark: "C1",
      widthMm: 300,
      depthMm: 450,
      heightMm: 3000,
      coverMm: 40,
      stirrupDiaMm: 8,
      spacingMm: 150,
      hookAngle: 135,
      tieType: "Closed",
      mainBars: [{ diaMm: 16, count: 6 }],
    });
    expect(r.bars.some((b) => b.role === "tie")).toBe(true);
    expect(r.bars.some((b) => b.role === "main" && b.barsPerMember === 6)).toBe(true);
  });

  it("beam At Support doubles top bars", () => {
    const r = computeBeamMember({
      mark: "B1",
      clearSpanMm: 5000,
      widthMm: 230,
      depthMm: 450,
      coverMm: 25,
      concreteGrade: "M25",
      steelGrade: "Fe500",
      stirrupDiaMm: 8,
      spacingSupportMm: 100,
      spacingMiddleMm: 200,
      stirrupLegs: 2,
      hookAngle: 135,
      topBarType: "At Support",
      topBars: [{ diaMm: 12, count: 2 }],
      bottomBars: [{ diaMm: 16, count: 3 }],
    });
    expect(r.bars.find((b) => b.role === "top")?.barsPerMember).toBe(4);
  });

  it("slab and footing emit checks", () => {
    const s = computeSlabMember({
      mark: "S1",
      spanXMm: 3000,
      spanYMm: 4000,
      thicknessMm: 150,
      coverMm: 20,
      concreteGrade: "M20",
      steelGrade: "Fe415",
      slabType: "One-Way",
      diaXMm: 10,
      spacingXMm: 150,
      diaYMm: 8,
      spacingYMm: 200,
    });
    expect(s.checks).toHaveLength(2);

    const f = computeFootingMember({
      mark: "F1",
      lengthMm: 2000,
      widthMm: 2000,
      columnLengthMm: 300,
      columnWidthMm: 300,
      depthMm: 500,
      coverMm: 50,
      concreteGrade: "M20",
      steelGrade: "Fe415",
      diaLMm: 12,
      spacingLMm: 150,
      diaBMm: 12,
      spacingBMm: 150,
    });
    expect(f.checks).toHaveLength(4);
  });
});
