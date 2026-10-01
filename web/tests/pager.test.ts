import { describe, expect, it } from "vitest";
import { ADMIN_PAGE_SIZE, pageRange, parsePage } from "../components/aorms/platform/Pager";

describe("pager helpers", () => {
  it("parses ?page safely", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });
  it("returns inclusive ranges for .range()", () => {
    expect(pageRange(1)).toEqual([0, ADMIN_PAGE_SIZE - 1]);
    expect(pageRange(2)).toEqual([ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE * 2 - 1]);
  });
});
