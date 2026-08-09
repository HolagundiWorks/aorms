import { z } from "zod";
import { MeasureKind, MeasurementUom } from "./item-library.js";

export const JointMeasurementStatus = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);
export type JointMeasurementStatus = z.infer<typeof JointMeasurementStatus>;

export const JOINT_MEASUREMENT_STATUS_LABEL: Record<JointMeasurementStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const JointMeasurementAnnotationTool = z.enum(["PEN", "HIGHLIGHT", "PIN", "CLOUD"]);
export type JointMeasurementAnnotationTool = z.infer<typeof JointMeasurementAnnotationTool>;

export const JointMeasurementUpsertDraft = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  measuredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  details: z.string().trim().max(4000).optional().nullable(),
  attentionToId: z.string().uuid().optional().nullable(),
  contractorId: z.string().uuid().optional().nullable(),
  sourceSubmissionId: z.string().uuid().optional().nullable(),
});
export type JointMeasurementUpsertDraft = z.infer<typeof JointMeasurementUpsertDraft>;

export const JointMeasurementLineInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().min(1).max(500),
  uom: MeasurementUom,
  measureKind: MeasureKind.default("LBH"),
  lengthMm: z.number().int().nonnegative().optional().nullable(),
  breadthMm: z.number().int().nonnegative().optional().nullable(),
  heightMm: z.number().int().nonnegative().optional().nullable(),
  countNos: z.number().positive().optional().nullable(),
  itemLibraryItemId: z.string().uuid().optional().nullable(),
  drawingId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});
export type JointMeasurementLineInput = z.infer<typeof JointMeasurementLineInput>;

export const JointMeasurementUpsertLines = z.object({
  jointMeasurementId: z.string().uuid(),
  lines: z.array(JointMeasurementLineInput).max(200),
  /** When true, replace all existing lines with this set (ids without match are deleted). */
  replace: z.boolean().optional().default(true),
});
export type JointMeasurementUpsertLines = z.infer<typeof JointMeasurementUpsertLines>;

export const JointMeasurementAnnotationUpsert = z.object({
  id: z.string().uuid().optional(),
  jointMeasurementId: z.string().uuid(),
  drawingId: z.string().uuid(),
  tool: JointMeasurementAnnotationTool,
  pageNo: z.number().int().nonnegative().default(0),
  color: z.string().max(32).optional(),
  label: z.string().trim().max(200).optional().nullable(),
  geometry: z.record(z.string(), z.unknown()),
});
export type JointMeasurementAnnotationUpsert = z.infer<typeof JointMeasurementAnnotationUpsert>;

export const RateBookCreateFromJointMeasurement = z.object({
  jointMeasurementId: z.string().uuid(),
  /** Existing unlocked rate book, or omit to create a new one. */
  rateBookId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  versionLabel: z.string().trim().max(40).optional(),
});
export type RateBookCreateFromJointMeasurement = z.infer<typeof RateBookCreateFromJointMeasurement>;

/** Infer measure kind from common Indian UOMs when the client omits it. */
export function measureKindFromUom(uom: string): z.infer<typeof MeasureKind> {
  const u = uom.trim().toUpperCase();
  if (u === "NOS" || u === "NO" || u === "EACH" || u === "SET") return "COUNT";
  if (u === "SQM" || u === "M2" || u === "SQ.M") return "LB";
  if (u === "CUM" || u === "M3" || u === "CU.M") return "LBH";
  return "L";
}
