import { describe, expect, it } from "vitest";
import { extractXerMilestones, parseXerTables } from "./p6-xer.js";

const SAMPLE_XER = `ERMHDR\t20.12\t2026-07-25\tProject Management\tadmin\tADMIN\tdbx\t4570\tProject Management
%T\tPROJECT
%F\tproj_id\tproj_short_name\tproj_name
%R\t1\tDEMO\tDemo Project
%T\tTASK
%F\ttask_id\tproj_id\ttask_code\ttask_name\ttask_type\tstatus_code\tphys_complete_pct\ttarget_start_date\ttarget_end_date\tact_start_date\tact_end_date\tearly_start_date\tearly_end_date
%R\t100\t1\tA1000\tFoundation Complete\tTT_Mile\tTK_NotStart\t0\t2026-08-01 00:00\t2026-08-01 00:00\t\t\t2026-08-01 00:00\t2026-08-01 00:00
%R\t101\t1\tA1010\tExcavation\tTT_Task\tTK_Active\t50\t2026-07-01 00:00\t2026-07-20 00:00\t2026-07-01 00:00\t\t2026-07-01 00:00\t2026-07-20 00:00
%R\t102\t1\tA1020\tHandover\tTT_FinMile\tTK_Complete\t100\t2026-12-15 00:00\t2026-12-15 00:00\t2026-12-15 00:00\t2026-12-15 00:00\t2026-12-15 00:00\t2026-12-15 00:00
%T\tWBSSTEP
%F\twbs_step_id\twbs_id\tstep_name\tcomplete_flag\tseq_num
%R\t9\t1\tDesign freeze\tN\t1
%E
`;

describe("p6-xer parser", () => {
  it("parses tables and fields", () => {
    const tables = parseXerTables(SAMPLE_XER);
    expect(tables.get("TASK")?.rows).toHaveLength(3);
    expect(tables.get("WBSSTEP")?.rows).toHaveLength(1);
    expect(tables.get("TASK")?.rows[0]?.task_name).toBe("Foundation Complete");
  });

  it("extracts milestones and WBS steps by default", () => {
    const rows = extractXerMilestones(SAMPLE_XER);
    expect(rows.map((r) => r.title)).toEqual([
      "Foundation Complete",
      "Handover",
      "Design freeze",
    ]);
    expect(rows[0]?.plannedDate).toBe("2026-08-01");
    expect(rows[0]?.baselineRef).toBe("A1000");
    expect(rows[1]?.status).toBe("COMPLETE");
    expect(rows[1]?.percentComplete).toBe(100);
    expect(rows[2]?.taskType).toBe("WBSSTEP");
  });

  it("can include all activities", () => {
    const rows = extractXerMilestones(SAMPLE_XER, { includeActivities: true });
    expect(rows.some((r) => r.title === "Excavation")).toBe(true);
    const excav = rows.find((r) => r.title === "Excavation")!;
    expect(excav.percentComplete).toBe(50);
    expect(excav.status).toBe("ON_TRACK");
  });
});
