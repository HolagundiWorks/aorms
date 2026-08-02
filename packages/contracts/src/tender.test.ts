import { describe, expect, it } from "vitest";
import {
  canTransitionTenderStatus,
  tenderBidsVisibleToFirm,
  TenderStatus,
} from "./tender.js";

describe("tender contracts", () => {
  it("labels every status", () => {
    for (const s of TenderStatus.options) expect(s.length).toBeGreaterThan(0);
  });

  it("allows draft → open → closed → awarded", () => {
    expect(canTransitionTenderStatus("DRAFT", "OPEN")).toBe(true);
    expect(canTransitionTenderStatus("OPEN", "CLOSED")).toBe(true);
    expect(canTransitionTenderStatus("CLOSED", "AWARDED")).toBe(true);
  });

  it("keeps bids sealed while open", () => {
    expect(tenderBidsVisibleToFirm("OPEN")).toBe(false);
    expect(tenderBidsVisibleToFirm("DRAFT")).toBe(false);
    expect(tenderBidsVisibleToFirm("CLOSED")).toBe(true);
    expect(tenderBidsVisibleToFirm("AWARDED")).toBe(true);
  });
});
