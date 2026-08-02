import { describe, expect, it } from "vitest";
import {
  steelReconLineVariance,
  steelReconTotals,
  steelWastageSeverity,
} from "./steel-reconciliation.js";

describe("steel reconciliation", () => {
  it("wastage severity thresholds", () => {
    expect(steelWastageSeverity(0)).toBe("WITHIN_LIMIT");
    expect(steelWastageSeverity(3.5)).toBe("WARNING");
    expect(steelWastageSeverity(6)).toBe("EXCEEDED");
    expect(steelWastageSeverity(-1)).toBe("WITHIN_LIMIT");
  });

  it("line variance", () => {
    const v = steelReconLineVariance({
      scheduledKg: 100,
      issuedKg: 105,
      consumedKg: 100,
    });
    expect(v.wastageKg).toBe(5);
    expect(v.wastagePct).toBeCloseTo(4.76, 1);
    expect(v.severity).toBe("WARNING");
  });

  it("totals", () => {
    const t = steelReconTotals([
      { scheduledKg: 100, issuedKg: 110, consumedKg: 100 },
      { scheduledKg: 50, issuedKg: 50, consumedKg: 48 },
    ]);
    expect(t.scheduledKg).toBe(150);
    expect(t.issuedKg).toBe(160);
    expect(t.consumedKg).toBe(148);
    expect(t.wastageKg).toBe(12);
  });
});
