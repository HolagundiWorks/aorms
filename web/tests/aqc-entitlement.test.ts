import { describe, expect, it } from "vitest";
import { evaluateEntitlement } from "../lib/aqc/entitlement";
import { AqcRow, PushProjectBody } from "../lib/aqc/contract";

const now = new Date("2026-10-09T00:00:00Z");
describe("evaluateEntitlement (D4/D7)", () => {
  it("connects paid, unexpired studios", () => {
    for (const plan of ["STUDIO", "PROFESSIONAL", "ENTERPRISE"]) expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan, expiresAt: null, now }).connected).toBe(true);
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "STUDIO", expiresAt: "2027-01-01T00:00:00Z", now }).reason).toBe("OK");
  });
  it("refuses free/trial, expired and unlinked studios with a reason", () => {
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "FREE", expiresAt: null, now })).toMatchObject({ connected: false, reason: "PLAN_NOT_CONNECTED" });
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "TRIAL", expiresAt: null, now }).connected).toBe(false);
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "PROFESSIONAL", expiresAt: "2026-10-01T00:00:00Z", now })).toMatchObject({ connected: false, reason: "EXPIRED" });
    expect(evaluateEntitlement({ studioPublicId: null, plan: null, expiresAt: null, now })).toMatchObject({ connected: false, reason: "NO_STUDIO" });
  });
});

describe("contract", () => {
  it("accepts a take-off row with a minted row id and rejects unknown sections or oversize ids", () => {
    expect(AqcRow.safeParse({ section: "masonry", row_id: "a1", fields: { mark: "MW1", length: "18000" } }).success).toBe(true);
    expect(AqcRow.safeParse({ section: "nope", row_id: "a1", fields: {} }).success).toBe(false);
    expect(AqcRow.safeParse({ section: "masonry", row_id: "x".repeat(65), fields: {} }).success).toBe(false);
  });
  it("defaults the project payload", () => {
    const p = PushProjectBody.parse({ projectOfficeId: "8072d05b-bff6-4090-ac93-8907ab434ed2" });
    expect(p.formatVersion).toBe(17);
    expect(p.rows).toEqual([]);
  });
});
