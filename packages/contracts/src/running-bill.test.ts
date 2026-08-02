import { describe, expect, it } from "vitest";
import {
  billLineAmountPaise,
  canAdvanceRunningBill,
  netPayablePaise,
} from "./running-bill.js";

describe("running bill helpers", () => {
  it("line amount and net payable", () => {
    expect(billLineAmountPaise(10, 150_00)).toBe(1_500_00);
    expect(
      netPayablePaise(1_000_00, {
        retentionPaise: 50_00,
        taxTdsPaise: 10_00,
        advanceRecoveryPaise: 0,
        otherRecoveryPaise: 0,
      }),
    ).toBe(940_00);
  });

  it("status transitions", () => {
    expect(canAdvanceRunningBill("DRAFT", "SITE_CHECKED")).toBe(true);
    expect(canAdvanceRunningBill("DRAFT", "CERTIFIED")).toBe(false);
    expect(canAdvanceRunningBill("CERTIFIED", "SENT_TO_CLIENT")).toBe(true);
    expect(canAdvanceRunningBill("CLOSED", "DRAFT")).toBe(false);
  });
});
