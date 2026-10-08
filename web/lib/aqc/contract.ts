/**
 * Wire contract for /api/aqc/v1 (version below). Mirrored into AQC as docs/SYNC-CONTRACT.md; a breaking change bumps
 * AQC_CONTRACT_VERSION. Take-off rows are schemaless string dictionaries in AQC, so `fields` is a string→string map and
 * the client mints a stable `row_id` (the `_rid` field) for each row on first sync.
 */
import { z } from "zod";

export const AQC_CONTRACT_VERSION = "2026-10-aqc-1";

/** Sections of a `.bbsproj` v17 that carry rows (everything else lives in project `settings`). */
export const AQC_SECTIONS = [
  "columns", "beams", "pedestals", "lintels", "slabs", "footings", "walls", "stairs", "masonry", "masonry_openings",
  "plaster", "finish_propose", "pcc", "earthwork", "ssm", "shuttering", "flooring", "painting", "waterproofing", "dpc",
  "coping", "screed", "vdf", "skirting", "parapet", "plinth_protection", "doors", "windows",
  "schedule_activities", "contracts", "contract_lines", "bills", "bill_lines", "transactions", "documents",
  "suppliers", "warehouses", "orders", "grns", "issues", "sites", "resources", "employees", "payroll", "link_rules",
] as const;

export const AqcRow = z.object({
  section: z.enum(AQC_SECTIONS),
  row_id: z.string().min(1).max(64),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  deleted: z.boolean().optional(),
});
export type AqcRow = z.infer<typeof AqcRow>;

export const PushRowsBody = z.object({ rows: z.array(AqcRow).max(2000) });
export const PushProjectBody = z.object({
  projectOfficeId: z.string().uuid(),
  formatVersion: z.number().int().min(1).max(1000).default(17),
  settings: z.record(z.string(), z.unknown()).default({}),
  rows: z.array(AqcRow).max(20000).default([]),
});
export const AddVersionBody = z.object({
  kind: z.enum(["estimate", "boq", "bbs", "schedule", "running_bill", "ipc", "final_account", "joint_measurement"]),
  contentHash: z.string().min(8).max(128),
  summary: z.record(z.string(), z.unknown()).default({}),
  storageKey: z.string().max(300).nullish(),
});
export const SessionBody = z.object({ clientLabel: z.string().max(120).optional() });

export const ROW_BATCH = 500;
