import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import { parseAndMatchFile } from "../lib/reconcile/match";

describe("reconcile: spreadsheet parsing (SheetJS 0.20.x — CVE-fixed build)", () => {
  it("parses an .xlsx statement and matches a credit to an open invoice", () => {
    const ws = utils.json_to_sheet([{ Date: "2026-09-01", Description: "NEFT INV-0001 Acme", Credit: 118000 }]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = Buffer.from(write(wb, { type: "buffer", bookType: "xlsx" }));
    const res = parseAndMatchFile(buf, "statement.xlsx", null, [{ id: "i1", ref: "INV-0001", totalPaise: 11800000 } as never]);
    expect(res.error).toBeUndefined();
    expect(res.rows).toBe(1);
  });
  it("rejects garbage without throwing", () => {
    const res = parseAndMatchFile(Buffer.from("not a spreadsheet"), "x.xlsx", null, []);
    expect(typeof res.rows).toBe("number");
  });
});
