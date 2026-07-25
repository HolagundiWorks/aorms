import { describe, expect, it } from "vitest";
import {
  PMC_RA_TRANSITIONS,
  PmcRaBillCreate,
  pmcRaLineAmountPaise,
  pmcRaNetPayablePaise,
} from "./pmc.js";

describe("pmc RA helpers", () => {
  it("computes line amount in paise", () => {
    expect(pmcRaLineAmountPaise(10, 150_00)).toBe(1_500_00);
    expect(pmcRaLineAmountPaise(2.5, 100_00)).toBe(250_00);
  });

  it("nets deductions without going negative", () => {
    expect(
      pmcRaNetPayablePaise({
        grossPaise: 1_000_00,
        advanceRecoveryPaise: 100_00,
        retentionPaise: 50_00,
        otherDeductionPaise: 25_00,
      }),
    ).toBe(825_00);
    expect(
      pmcRaNetPayablePaise({
        grossPaise: 100_00,
        advanceRecoveryPaise: 80_00,
        retentionPaise: 40_00,
        otherDeductionPaise: 0,
      }),
    ).toBe(0);
  });

  it("allows the certification path DRAFT → … → CLOSED", () => {
    expect(PMC_RA_TRANSITIONS.DRAFT).toContain("SITE_CHECKED");
    expect(PMC_RA_TRANSITIONS.SITE_CHECKED).toContain("CERTIFIED");
    expect(PMC_RA_TRANSITIONS.CERTIFIED).toContain("SENT_TO_CLIENT");
    expect(PMC_RA_TRANSITIONS.SENT_TO_CLIENT).toContain("CLOSED");
    expect(PMC_RA_TRANSITIONS.CLOSED).toEqual([]);
  });

  it("validates create payload", () => {
    const parsed = PmcRaBillCreate.safeParse({
      projectId: "00000000-0000-4000-8000-000000000001",
      billNo: "RA-01",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      lines: [{ description: "RCC M25", thisQty: 12, ratePaise: 850000 }],
    });
    expect(parsed.success).toBe(true);
  });
});
