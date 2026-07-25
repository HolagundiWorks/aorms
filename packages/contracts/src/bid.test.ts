import { describe, expect, it } from "vitest";
import {
  BID_STATUS_LABEL,
  BidSource,
  BidStatus,
  canTransitionBidStatus,
} from "./bid.js";

describe("bid desk contracts", () => {
  it("labels every status and source", () => {
    for (const s of BidStatus.options) expect(BID_STATUS_LABEL[s]).toBeTruthy();
    for (const s of BidSource.options) expect(s.length).toBeGreaterThan(0);
  });

  it("allows watching → preparing → submitted → won", () => {
    expect(canTransitionBidStatus("WATCHING", "PREPARING")).toBe(true);
    expect(canTransitionBidStatus("PREPARING", "SUBMITTED")).toBe(true);
    expect(canTransitionBidStatus("SUBMITTED", "WON")).toBe(true);
  });

  it("blocks jumps from watching to won", () => {
    expect(canTransitionBidStatus("WATCHING", "WON")).toBe(false);
  });

  it("treats same status as allowed (idempotent set)", () => {
    expect(canTransitionBidStatus("SUBMITTED", "SUBMITTED")).toBe(true);
  });
});
