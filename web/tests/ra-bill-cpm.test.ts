import { describe, expect, it } from "vitest";
import { computeRaBill, raBillNumber } from "../lib/billing/ra-bill";
import { computeCpm, dateForOffset } from "../lib/scheduling/cpm";

describe("computeRaBill (AQC RunningBill)", () => {
  it("adds GST and deducts retention/TDS/cess/advance from the invoice total", () => {
    const s = computeRaBill([{ description: "RCC", ratePaise: 1000, qty: 1000 }], {
      retentionPct: 5, gstPct: 18, tdsPct: 2, cessPct: 1, gstTdsPct: 0, advanceRecoveryPaise: 5_000_00, otherDeductionsPaise: 0,
    });
    expect(s.grossPaise).toBe(1_000_000);
    expect(s.gstPaise).toBe(180_000);
    expect(s.invoicePaise).toBe(1_180_000);
    expect(s.retentionPaise).toBe(50_000);
    expect(s.totalDeductionsPaise).toBe(50_000 + 20_000 + 10_000 + 500_000);
    expect(s.netPaise).toBe(1_180_000 - 580_000);
  });
  it("numbers bills per FY", () => expect(raBillNumber("AB", "2026-27", 7)).toBe("AB/RA/2026-27/007"));
});

describe("computeCpm (AQC ScheduleCalculator)", () => {
  it("finds the critical path and float", () => {
    const r = computeCpm([
      { id: "A", durationDays: 3, links: [] },
      { id: "B", durationDays: 4, links: [{ predecessorId: "A", type: "FS", lagDays: 0 }] },
      { id: "C", durationDays: 2, links: [{ predecessorId: "A", type: "FS", lagDays: 0 }] },
      { id: "D", durationDays: 1, links: [{ predecessorId: "B", type: "FS", lagDays: 0 }, { predecessorId: "C", type: "FS", lagDays: 0 }] },
    ]);
    const m = new Map(r.activities.map((a) => [a.id, a]));
    expect(r.projectDurationDays).toBe(8);
    expect(m.get("C")!.totalFloat).toBe(2);
    expect(r.activities.filter((a) => a.isCritical).map((a) => a.id)).toEqual(["A", "B", "D"]);
  });
  it("flags cycles and supports SS lag", () => {
    expect(computeCpm([{ id: "A", durationDays: 1, links: [{ predecessorId: "B", type: "FS", lagDays: 0 }] }, { id: "B", durationDays: 1, links: [{ predecessorId: "A", type: "FS", lagDays: 0 }] }]).hasCycle).toBe(true);
    const r = computeCpm([{ id: "A", durationDays: 5, links: [] }, { id: "B", durationDays: 2, links: [{ predecessorId: "A", type: "SS", lagDays: 2 }] }]);
    expect(r.activities[1].earlyStart).toBe(2);
    expect(dateForOffset("2026-10-01", 8)).toBe("2026-10-09");
  });
});

import { buildMeetingIcs } from "../lib/contractor/ics";
describe("buildMeetingIcs", () => {
  it("builds an escaped UTC event", () => {
    const ics = buildMeetingIcs({ uid: "u1", startsAt: new Date("2026-10-20T05:30:00Z"), summary: "Site, visit", place: "Office" });
    expect(ics).toContain("DTSTART:20261020T053000Z");
    expect(ics).toContain("DTEND:20261020T063000Z");
    expect(ics).toContain("SUMMARY:Site\\, visit");
  });
});

import { computeFinalAccount } from "../lib/billing/final-account";
import { buildMeasurementAbstract } from "../lib/billing/measurement-abstract";
describe("final account + measurement abstract", () => {
  it("rolls variations, certified net, retention and balance", () => {
    const bill = { status: "CLOSED", grossPaise: 1_000_000, gstPaise: 180_000, retentionPaise: 50_000, tdsPaise: 20_000, cessPaise: 10_000, gstTdsPaise: 0, advanceRecoveryPaise: 0, otherDeductionPaise: 0, paidPaise: 700_000 };
    const fa = computeFinalAccount(2_000_000, 100_000, [bill, { ...bill, status: "DRAFT", paidPaise: 0 }]);
    expect(fa.finalValuePaise).toBe(2_100_000);
    expect(fa.netCertifiedPaise).toBe(1_100_000);
    expect(fa.balanceDuePaise).toBe(1_100_000 + 50_000 - 700_000);
    expect(fa.unbilledPaise).toBe(100_000);
    expect(fa.projected).toBe(true);
  });
  it("accumulates quantities across bills", () => {
    const a = buildMeasurementAbstract([
      { billNo: "1", description: "PCC", unit: "cum", ratePaise: 500_000, thisQty: 4 },
      { billNo: "2", description: "pcc ", unit: "cum", ratePaise: 500_000, thisQty: 6 },
    ]);
    expect(a.rows).toHaveLength(1);
    expect(a.rows[0].toDateQty).toBe(10);
    expect(a.totalPaise).toBe(5_000_000);
  });
});
