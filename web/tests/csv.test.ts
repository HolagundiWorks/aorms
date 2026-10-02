import { describe, expect, it } from "vitest";
import { toCsv } from "../lib/import-export/csv";

describe("toCsv", () => {
  it("neutralises spreadsheet formulae (CSV injection)", () => {
    const csv = toCsv([{ Name: '=HYPERLINK("http://evil","x")' }, { Name: "+1+1" }, { Name: "@SUM(A1)" }, { Name: "-2+3" }, { Name: "Plain" }], ["Name"]);
    const lines = csv.split("\r\n").slice(1);
    expect(lines[0]).toMatch(/^"'=/);
    expect(lines[1]).toMatch(/^"'\+/);
    expect(lines[2]).toMatch(/^"'@/);
    expect(lines[3]).toMatch(/^"'-/);
    expect(lines[4]).toBe("Plain");
  });
});
