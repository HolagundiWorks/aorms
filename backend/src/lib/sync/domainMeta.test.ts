import { META_STREAM_FIRM, type MetaEventRecord } from "@esti/contracts";
import { describe, expect, it } from "vitest";
import { mergeMetaPatch } from "./metadata.js";

function event(partial: Partial<MetaEventRecord> & Pick<MetaEventRecord, "entity" | "patch">): MetaEventRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    firmId: "00000000-0000-4000-8000-0000000000aa",
    stream: META_STREAM_FIRM,
    seq: 1,
    entityId: "task-1",
    op: "UPSERT",
    conflict: "lwwField",
    createdAt: "2026-08-06T00:00:00.000Z",
    updatedAt: "2026-08-06T00:00:01.000Z",
    ...partial,
  };
}

describe("LF3 domain meta merge (spot-check)", () => {
  it("LWW prefers newer task patch", () => {
    const current = {
      title: "Old",
      status: "TODO",
      updatedAt: "2026-08-06T00:00:00.000Z",
    };
    const merged = mergeMetaPatch(
      current,
      event({
        entity: "task",
        patch: { title: "New", status: "DONE" },
        updatedAt: "2026-08-06T00:00:02.000Z",
      }),
    );
    expect(merged.title).toBe("New");
    expect(merged.status).toBe("DONE");
  });

  it("serverSeq overwrites estimate totals", () => {
    const current = { grandTotalPaise: 100, updatedAt: "2026-08-06T00:00:05.000Z" };
    const merged = mergeMetaPatch(
      current,
      event({
        entity: "estimateTotals",
        conflict: "serverSeq",
        patch: { grandTotalPaise: 250 },
        updatedAt: "2026-08-06T00:00:01.000Z",
      }),
    );
    expect(merged.grandTotalPaise).toBe(250);
  });

  it("phaseProgress serverSeq applies status", () => {
    const merged = mergeMetaPatch(
      { status: "NOT_STARTED" },
      event({
        entity: "phaseProgress",
        conflict: "serverSeq",
        patch: { status: "COMPLETE", pctComplete: 100 },
      }),
    );
    expect(merged.status).toBe("COMPLETE");
    expect(merged.pctComplete).toBe(100);
  });
});
