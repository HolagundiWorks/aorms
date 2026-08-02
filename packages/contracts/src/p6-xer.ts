import { z } from "zod";
import type { PmcMilestoneStatus } from "./pmc.js";

/**
 * Primavera P6 XER → AProc master-programme milestones.
 * Governance import only — not a CPM engine or full schedule sync.
 *
 * XER is tab-delimited with `%T` table / `%F` fields / `%R` row / `%E` end markers.
 * Milestone activities use `task_type` TT_Mile / TT_FinMile (zero-duration).
 */

export const PmcMilestoneXerImport = z.object({
  projectId: z.string().uuid(),
  xer: z.string().min(10).max(8_000_000),
  /** When true, import every TASK activity (capped), not only milestones. */
  includeActivities: z.boolean().optional(),
});
export type PmcMilestoneXerImport = z.infer<typeof PmcMilestoneXerImport>;

export type XerTable = {
  name: string;
  fields: string[];
  rows: Record<string, string>[];
};

export type XerMilestoneRow = {
  title: string;
  plannedDate?: string;
  actualDate?: string;
  baselineRef?: string;
  percentComplete: number;
  status: PmcMilestoneStatus;
  notes?: string;
  taskType: string;
};

const MILESTONE_TYPES = new Set(["TT_Mile", "TT_FinMile", "TT_StartMile"]);

function splitXerLine(line: string): string[] {
  // XER uses tab separators; keep empty cells.
  return line.split("\t");
}

function parseXerDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s || s === "null") return undefined;
  // Common: YYYY-MM-DD HH:MM or YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1];
}

function parsePct(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  // P6 often stores 0–100; sometimes 0–1.
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromTask(row: Record<string, string>, pct: number): PmcMilestoneStatus {
  const code = (row.status_code ?? "").toUpperCase();
  if (code.includes("COMPLETE") || pct >= 100) return "COMPLETE";
  if (code.includes("ACTIVE") || pct > 0) return "ON_TRACK";
  return "PLANNED";
}

/** Parse an XER document into named tables. */
export function parseXerTables(text: string): Map<string, XerTable> {
  const tables = new Map<string, XerTable>();
  let current: XerTable | null = null;

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const raw of lines) {
    if (!raw) continue;
    const parts = splitXerLine(raw);
    const tag = parts[0]?.trim();
    if (!tag) continue;

    if (tag === "%T") {
      const name = (parts[1] ?? "").trim();
      if (!name) {
        current = null;
        continue;
      }
      current = { name, fields: [], rows: [] };
      tables.set(name, current);
      continue;
    }
    if (tag === "%F" && current) {
      current.fields = parts.slice(1).map((f) => f.trim());
      continue;
    }
    if (tag === "%R" && current) {
      const values = parts.slice(1);
      const row: Record<string, string> = {};
      for (let i = 0; i < current.fields.length; i++) {
        const key = current.fields[i]!;
        row[key] = values[i] ?? "";
      }
      current.rows.push(row);
      continue;
    }
    if (tag === "%E") {
      current = null;
    }
  }
  return tables;
}

/**
 * Extract governance milestones from XER TASK (+ optional WBSSTEP).
 * Default: milestones only. Cap applied by caller.
 */
export function extractXerMilestones(
  xerText: string,
  opts?: { includeActivities?: boolean },
): XerMilestoneRow[] {
  const tables = parseXerTables(xerText);
  const out: XerMilestoneRow[] = [];

  const task = tables.get("TASK");
  if (task) {
    for (const row of task.rows) {
      const taskType = (row.task_type ?? "").trim();
      const isMile = MILESTONE_TYPES.has(taskType);
      if (!isMile && !opts?.includeActivities) continue;

      const title = (row.task_name ?? row.task_code ?? "").trim();
      if (title.length < 2) continue;

      const pct = parsePct(row.phys_complete_pct);
      const plannedDate =
        parseXerDate(row.target_end_date) ??
        parseXerDate(row.target_start_date) ??
        parseXerDate(row.early_end_date) ??
        parseXerDate(row.early_start_date) ??
        parseXerDate(row.cstr_date);
      const actualDate =
        parseXerDate(row.act_end_date) ?? parseXerDate(row.act_start_date);

      out.push({
        title: title.slice(0, 200),
        plannedDate,
        actualDate,
        baselineRef: (row.task_code ?? "").trim().slice(0, 120) || undefined,
        percentComplete: pct,
        status: statusFromTask(row, pct),
        notes: isMile ? undefined : `P6 activity (${taskType || "TT_Task"})`,
        taskType: taskType || "TT_Task",
      });
    }
  }

  const wbsStep = tables.get("WBSSTEP");
  if (wbsStep) {
    for (const row of wbsStep.rows) {
      const title = (row.step_name ?? "").trim();
      if (title.length < 2) continue;
      const complete = (row.complete_flag ?? "").toUpperCase() === "Y";
      out.push({
        title: title.slice(0, 200),
        baselineRef: row.wbs_step_id ? `WBSSTEP-${row.wbs_step_id}`.slice(0, 120) : undefined,
        percentComplete: complete ? 100 : 0,
        status: complete ? "COMPLETE" : "PLANNED",
        notes: "P6 WBS milestone",
        taskType: "WBSSTEP",
      });
    }
  }

  return out;
}
