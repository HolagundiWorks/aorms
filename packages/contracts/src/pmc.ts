import { z } from "zod";

export const PmcProjectParams = z.object({
  projectId: z.string().uuid(),
});
export type PmcProjectParams = z.infer<typeof PmcProjectParams>;

export const SnagStatus = z.enum(["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"]);
export type SnagStatus = z.infer<typeof SnagStatus>;

export const SNAG_STATUS_LABEL: Record<SnagStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};

export const SnagCreate = z.object({
  projectId: z.string().uuid(),
  location: z.string().max(200).optional(),
  trade: z.string().max(100).optional(),
  description: z.string().min(2).max(2000),
  dueDate: z.string().date().optional(),
});
export type SnagCreate = z.infer<typeof SnagCreate>;

export const SnagUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  location: z.string().max(200).nullable().optional(),
  trade: z.string().max(100).nullable().optional(),
  description: z.string().min(2).max(2000).optional(),
  status: SnagStatus.optional(),
  dueDate: z.string().date().nullable().optional(),
});
export type SnagUpdate = z.infer<typeof SnagUpdate>;

export const SiteInstructionCreate = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid().optional(),
  subject: z.string().min(2).max(200),
  body: z.string().max(8000).optional(),
  issuedAt: z.string().date().optional(),
});
export type SiteInstructionCreate = z.infer<typeof SiteInstructionCreate>;

export const SubmittalReviewCode = z.enum(["A", "B", "C", "D"]);
export type SubmittalReviewCode = z.infer<typeof SubmittalReviewCode>;

export const SUBMITTAL_REVIEW_LABEL: Record<SubmittalReviewCode, string> = {
  A: "Approved",
  B: "Approved as noted",
  C: "Rejected",
  D: "Revise and resubmit",
};

export const ConstructionReview = z.object({
  id: z.string().uuid(),
  reviewCode: SubmittalReviewCode,
  reviewNote: z.string().max(4000).optional(),
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DECLINED"]).optional(),
});
export type ConstructionReview = z.infer<typeof ConstructionReview>;

export const ProgressReportCreate = z.object({
  projectId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  narrative: z.string().max(12000).optional(),
  physicalProgressPct: z.number().int().min(0).max(100).optional(),
});
export type ProgressReportCreate = z.infer<typeof ProgressReportCreate>;

export const ProgressReportUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  narrative: z.string().max(12000).nullable().optional(),
  physicalProgressPct: z.number().int().min(0).max(100).nullable().optional(),
});
export type ProgressReportUpdate = z.infer<typeof ProgressReportUpdate>;

export const PhaseProgressUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]),
});
export type PhaseProgressUpdate = z.infer<typeof PhaseProgressUpdate>;

export const DEFAULT_LIVE_STAGES: Record<string, { code: string; label: string }[]> = {
  CONSTRUCTION_ADMINISTRATION: [
    { code: "SITE_KICKOFF", label: "Site kick-off" },
    { code: "MONITORING", label: "Construction monitoring" },
    { code: "SITE_QUERIES", label: "Site queries" },
    { code: "MATERIAL_APPROVALS", label: "Material approvals" },
    { code: "SNAG_REVIEW", label: "Snag review" },
  ],
  HANDOVER_CLOSEOUT: [
    { code: "FINAL_INSPECTION", label: "Final inspection" },
    { code: "SNAG_CLOSURE", label: "Snag closure" },
    { code: "AS_BUILT", label: "As-built documentation" },
    { code: "HANDOVER", label: "Handover" },
    { code: "CLOSURE", label: "Project closure" },
  ],
};

/** Master programme milestone — client reporting, not contractor CPM. */
export const PmcMilestoneStatus = z.enum([
  "PLANNED",
  "ON_TRACK",
  "AT_RISK",
  "DELAYED",
  "COMPLETE",
]);
export type PmcMilestoneStatus = z.infer<typeof PmcMilestoneStatus>;

export const PMC_MILESTONE_STATUS_LABEL: Record<PmcMilestoneStatus, string> = {
  PLANNED: "Planned",
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  DELAYED: "Delayed",
  COMPLETE: "Complete",
};

export const PmcMilestoneCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  plannedDate: z.string().date().optional(),
  baselineRef: z.string().max(120).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  notes: z.string().max(4000).optional(),
});
export type PmcMilestoneCreate = z.infer<typeof PmcMilestoneCreate>;

export const PmcMilestoneUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  plannedDate: z.string().date().nullable().optional(),
  actualDate: z.string().date().nullable().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  status: PmcMilestoneStatus.optional(),
  baselineRef: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  notes: z.string().max(4000).nullable().optional(),
});
export type PmcMilestoneUpdate = z.infer<typeof PmcMilestoneUpdate>;

/** Work package / tender package — owner-side oversight (PMC certifies, does not bid). */
export const PmcPackageStatus = z.enum([
  "DRAFT",
  "TENDERING",
  "AWARDED",
  "IN_PROGRESS",
  "COMPLETE",
  "CANCELLED",
]);
export type PmcPackageStatus = z.infer<typeof PmcPackageStatus>;

export const PMC_PACKAGE_STATUS_LABEL: Record<PmcPackageStatus, string> = {
  DRAFT: "Draft",
  TENDERING: "Tendering",
  AWARDED: "Awarded",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
};

export const PmcPackageCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  trade: z.string().max(100).optional(),
  contractorId: z.string().uuid().optional(),
  contractValuePaise: z.number().int().min(0).optional(),
  tenderCloseDate: z.string().date().optional(),
  notes: z.string().max(4000).optional(),
});
export type PmcPackageCreate = z.infer<typeof PmcPackageCreate>;

export const PmcPackageUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  trade: z.string().max(100).nullable().optional(),
  status: PmcPackageStatus.optional(),
  contractorId: z.string().uuid().nullable().optional(),
  contractValuePaise: z.number().int().min(0).nullable().optional(),
  tenderCloseDate: z.string().date().nullable().optional(),
  awardDate: z.string().date().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});
export type PmcPackageUpdate = z.infer<typeof PmcPackageUpdate>;

/** CSV import for master programme (Wave 4) — title,plannedDate,baselineRef,notes */
export const PmcMilestoneCsvImport = z.object({
  projectId: z.string().uuid(),
  csv: z.string().min(1).max(500_000),
});
export type PmcMilestoneCsvImport = z.infer<typeof PmcMilestoneCsvImport>;

/**
 * RA bill certification — PMC certifies contractor interim bills for the client.
 * Not the firm's own revenue; amounts are certified figures (paise).
 */
export const PmcRaBillStatus = z.enum([
  "DRAFT",
  "SITE_CHECKED",
  "CERTIFIED",
  "SENT_TO_CLIENT",
  "CLOSED",
]);
export type PmcRaBillStatus = z.infer<typeof PmcRaBillStatus>;

export const PMC_RA_BILL_STATUS_LABEL: Record<PmcRaBillStatus, string> = {
  DRAFT: "Draft",
  SITE_CHECKED: "Site checked",
  CERTIFIED: "Certified",
  SENT_TO_CLIENT: "Sent to client",
  CLOSED: "Closed",
};

export const PmcRaLineInput = z.object({
  description: z.string().min(1).max(500),
  unit: z.string().max(40).optional(),
  previousQty: z.number().min(0).max(1e12).optional(),
  thisQty: z.number().min(0).max(1e12),
  ratePaise: z.number().int().min(0),
});
export type PmcRaLineInput = z.infer<typeof PmcRaLineInput>;

export const PmcRaBillCreate = z.object({
  projectId: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  billNo: z.string().min(1).max(80),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  narrative: z.string().max(8000).optional(),
  lines: z.array(PmcRaLineInput).min(1).max(200),
  advanceRecoveryPaise: z.number().int().min(0).optional(),
  retentionPaise: z.number().int().min(0).optional(),
  otherDeductionPaise: z.number().int().min(0).optional(),
  otherDeductionNote: z.string().max(500).optional(),
  gstNote: z.string().max(500).optional(),
  tdsNote: z.string().max(500).optional(),
});
export type PmcRaBillCreate = z.infer<typeof PmcRaBillCreate>;

export const PmcRaBillUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  packageId: z.string().uuid().nullable().optional(),
  billNo: z.string().min(1).max(80).optional(),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  narrative: z.string().max(8000).nullable().optional(),
  lines: z.array(PmcRaLineInput).min(1).max(200).optional(),
  advanceRecoveryPaise: z.number().int().min(0).optional(),
  retentionPaise: z.number().int().min(0).optional(),
  otherDeductionPaise: z.number().int().min(0).optional(),
  otherDeductionNote: z.string().max(500).nullable().optional(),
  gstNote: z.string().max(500).nullable().optional(),
  tdsNote: z.string().max(500).nullable().optional(),
});
export type PmcRaBillUpdate = z.infer<typeof PmcRaBillUpdate>;

export const PmcRaBillTransition = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  to: PmcRaBillStatus,
});
export type PmcRaBillTransition = z.infer<typeof PmcRaBillTransition>;

/** Allowed status transitions for RA certification. */
export const PMC_RA_TRANSITIONS: Record<PmcRaBillStatus, readonly PmcRaBillStatus[]> = {
  DRAFT: ["SITE_CHECKED"],
  SITE_CHECKED: ["DRAFT", "CERTIFIED"],
  CERTIFIED: ["SENT_TO_CLIENT"],
  SENT_TO_CLIENT: ["CLOSED"],
  CLOSED: [],
};

export function pmcRaLineAmountPaise(thisQty: number, ratePaise: number): number {
  return Math.round(thisQty * ratePaise);
}

export function pmcRaNetPayablePaise(input: {
  grossPaise: number;
  advanceRecoveryPaise: number;
  retentionPaise: number;
  otherDeductionPaise: number;
}): number {
  return Math.max(
    0,
    input.grossPaise -
      input.advanceRecoveryPaise -
      input.retentionPaise -
      input.otherDeductionPaise,
  );
}

/** Package tender invite — PMC invites contractors; firm does not bid. */
export const PmcInviteStatus = z.enum(["INVITED", "WITHDRAWN", "DECLINED"]);
export type PmcInviteStatus = z.infer<typeof PmcInviteStatus>;

export const PmcPackageInviteCreate = z.object({
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  contractorId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  /** When true (default), set package status to TENDERING. */
  startTendering: z.boolean().optional(),
});
export type PmcPackageInviteCreate = z.infer<typeof PmcPackageInviteCreate>;

export const PmcBidStatus = z.enum(["SUBMITTED", "WITHDRAWN", "AWARDED", "REJECTED"]);
export type PmcBidStatus = z.infer<typeof PmcBidStatus>;

export const PmcPackageBidSubmit = z.object({
  packageId: z.string().uuid(),
  amountPaise: z.number().int().min(1),
  coverNote: z.string().max(8000).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
});
export type PmcPackageBidSubmit = z.infer<typeof PmcPackageBidSubmit>;

export const PmcPackageAward = z.object({
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  bidId: z.string().uuid(),
});
export type PmcPackageAward = z.infer<typeof PmcPackageAward>;

/**
 * Steel certification — issued vs consumed kg (lightweight, no BBS ERP).
 * Wastage % = max(0, (issued − consumed) / issued × 100) when issued > 0.
 */
export const PmcSteelCertStatus = z.enum([
  "DRAFT",
  "SITE_CHECKED",
  "CERTIFIED",
  "SENT_TO_CLIENT",
  "CLOSED",
]);
export type PmcSteelCertStatus = z.infer<typeof PmcSteelCertStatus>;

export const PMC_STEEL_CERT_STATUS_LABEL: Record<PmcSteelCertStatus, string> = {
  DRAFT: "Draft",
  SITE_CHECKED: "Site checked",
  CERTIFIED: "Certified",
  SENT_TO_CLIENT: "Sent to client",
  CLOSED: "Closed",
};

export const PMC_STEEL_TRANSITIONS: Record<PmcSteelCertStatus, readonly PmcSteelCertStatus[]> = {
  DRAFT: ["SITE_CHECKED"],
  SITE_CHECKED: ["DRAFT", "CERTIFIED"],
  CERTIFIED: ["SENT_TO_CLIENT"],
  SENT_TO_CLIENT: ["CLOSED"],
  CLOSED: [],
};

export const PmcSteelCertCreate = z.object({
  projectId: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  issuedKg: z.number().min(0).max(1e9),
  consumedKg: z.number().min(0).max(1e9),
  narrative: z.string().max(8000).optional(),
});
export type PmcSteelCertCreate = z.infer<typeof PmcSteelCertCreate>;

export const PmcSteelCertUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  packageId: z.string().uuid().nullable().optional(),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  issuedKg: z.number().min(0).max(1e9).optional(),
  consumedKg: z.number().min(0).max(1e9).optional(),
  narrative: z.string().max(8000).nullable().optional(),
});
export type PmcSteelCertUpdate = z.infer<typeof PmcSteelCertUpdate>;

export const PmcSteelCertTransition = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  to: PmcSteelCertStatus,
});
export type PmcSteelCertTransition = z.infer<typeof PmcSteelCertTransition>;

export function pmcSteelWastagePct(issuedKg: number, consumedKg: number): number {
  if (issuedKg <= 0) return 0;
  return Math.max(0, Math.round(((issuedKg - consumedKg) / issuedKg) * 1000) / 10);
}

/** Owner-triggered AProc portfolio digest email. */
export const PmcDigestSend = z.object({
  /** Override recipient; defaults to firm.email then actor email. */
  to: z.string().email().optional(),
});
export type PmcDigestSend = z.infer<typeof PmcDigestSend>;
