import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeRaBill } from "../lib/billing/ra-bill";
import { computeCpm, type Activity } from "../lib/scheduling/cpm";

/** Top-level keys of AQC's ProjectStore.ToJson() (format "bbsproj", version 17). */
const AQC_V17_KEYS = [
  "format", "version", "name", "project", "parties", "estimate_markups", "concrete_from_rmc", "settings", "levels",
  "columns", "beams", "pedestals", "lintels", "slabs", "footings", "walls", "stairs", "masonry", "masonry_openings",
  "plaster", "finish_propose", "pcc", "earthwork", "ssm", "shuttering", "flooring", "painting", "waterproofing", "dpc",
  "coping", "screed", "vdf", "skirting", "parapet", "plinth_protection", "doors", "windows", "takeoff", "schedule",
  "office", "contracts", "accounts", "stores", "org", "link_rules", "last_estimate", "last_estimate_rate_book_version_id",
];
const SHEETS = AQC_V17_KEYS.slice(9, 37);

const proj = JSON.parse(readFileSync(new URL("./fixtures/aqc/pilot-sample.bbsproj", import.meta.url), "utf8"));

describe("pilot-sample.bbsproj (synthetic AQC v17 project)", () => {
  it("has exactly AQC's v17 top-level keys", () => {
    expect(Object.keys(proj).sort()).toEqual([...AQC_V17_KEYS].sort());
    expect(proj.format).toBe("bbsproj");
    expect(proj.version).toBe(17);
    expect(proj.project.hub_project_id).toBe("");
  });

  it("take-off sheets are arrays of string-valued rows with no row ids (the gap the sync design adds _rid for)", () => {
    for (const k of SHEETS) {
      expect(Array.isArray(proj[k]), k).toBe(true);
      for (const r of proj[k]) {
        expect(Object.values(r).every((v) => typeof v === "string"), k).toBe(true);
        expect(r).not.toHaveProperty("_rid");
        expect(r).not.toHaveProperty("id");
      }
    }
    expect(SHEETS.reduce((n, k) => n + proj[k].length, 0)).toBeGreaterThan(15);
  });

  it("every opening names a masonry wall that exists; every level reference resolves", () => {
    const marks = new Set(proj.masonry.map((m: Record<string, string>) => m.mark));
    for (const o of proj.masonry_openings) expect(marks.has(o.wall_mark)).toBe(true);
    const levels = new Set(proj.levels.map((l: { id: string }) => l.id));
    for (const k of SHEETS) for (const r of proj[k]) if (r.level) expect(levels.has(r.level), `${k}:${r.mark}`).toBe(true);
  });

  it("schedule links resolve and our CPM engine finds a critical path", () => {
    const acts: Activity[] = proj.schedule.activities.map((a: { id: string; duration: number; links: { pred: string; type: "FS"; lag: number }[] }) => ({
      id: a.id, durationDays: a.duration, links: a.links.map((l) => ({ predecessorId: l.pred, type: l.type, lagDays: l.lag })),
    }));
    const ids = new Set(acts.map((a) => a.id));
    for (const a of acts) for (const l of a.links) expect(ids.has(l.predecessorId)).toBe(true);
    const r = computeCpm(acts);
    expect(r.hasCycle).toBe(false);
    expect(r.criticalCount).toBeGreaterThan(0);
    expect(r.projectDurationDays).toBeGreaterThan(60);
  });

  it("the sample RA bill reproduces through the ported billing engine", () => {
    const b = proj.accounts.bills[0];
    const st = computeRaBill(
      b.lines.map((l: { description: string; unit: string; rate: number; qty: number }) => ({ description: l.description, unit: l.unit, ratePaise: Math.round(l.rate * 100), qty: l.qty })),
      { retentionPct: b.retention_pct, gstPct: b.gst_pct, tdsPct: b.tds_pct, cessPct: b.cess_pct, gstTdsPct: b.gst_tds_pct, advanceRecoveryPaise: 0, otherDeductionsPaise: 0 },
    );
    // 54 cum × ₹5,200 + 18 cum × ₹9,800 = ₹4,57,200 gross; GST 18% = ₹82,296; deductions 5+2+1 = 8% = ₹36,576.
    expect(st.grossPaise).toBe(45_720_000);
    expect(st.gstPaise).toBe(8_229_600);
    expect(st.totalDeductionsPaise).toBe(3_657_600);
    expect(st.netPaise).toBe(45_720_000 + 8_229_600 - 3_657_600);
  });
});
