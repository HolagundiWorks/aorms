import { z } from "zod";

/**
 * Contractor portal submission kinds — tickets raised from the firm-portal
 * ActionDock (raise ticket · site visit · drawing · meeting · clarification ·
 * joint measurement). Stored on `esti_contractor_submission.kind`.
 */
export const ContractorPortalSubmissionKind = z.enum([
  "TICKET",
  "RFI",
  "DRAWING_REQUEST",
  "MEETING_REQUEST",
  "SITE_VISIT_REQUEST",
  "JOINT_MEASUREMENT",
]);
export type ContractorPortalSubmissionKind = z.infer<typeof ContractorPortalSubmissionKind>;

export const CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL: Record<
  ContractorPortalSubmissionKind,
  string
> = {
  TICKET: "Ticket",
  RFI: "Clarification (RFI)",
  DRAWING_REQUEST: "Drawing request",
  MEETING_REQUEST: "Meeting request",
  SITE_VISIT_REQUEST: "Site visit request",
  JOINT_MEASUREMENT: "Joint measurement",
};

export const ContractorPortalSubmissionStatus = z.enum([
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DECLINED",
]);
export type ContractorPortalSubmissionStatus = z.infer<
  typeof ContractorPortalSubmissionStatus
>;

export const CONTRACTOR_PORTAL_SUBMISSION_STATUS_LABEL: Record<
  ContractorPortalSubmissionStatus,
  string
> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  DECLINED: "Declined",
};

export const ContractorPortalSubmitInput = z.object({
  invitationId: z.string().uuid(),
  kind: ContractorPortalSubmissionKind,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).optional(),
  /** Preferred date for site visit / meeting / joint measurement (ISO date). */
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type ContractorPortalSubmitInput = z.infer<typeof ContractorPortalSubmitInput>;
