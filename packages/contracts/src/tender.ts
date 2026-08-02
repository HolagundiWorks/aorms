import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * Project tenders — the firm **issues** a tender; invited contractors bid in the
 * contractor portal. The firm does not bid.
 */

export const TenderStatus = z.enum(["DRAFT", "OPEN", "CLOSED", "AWARDED", "CANCELLED"]);
export type TenderStatus = z.infer<typeof TenderStatus>;

export const TENDER_STATUS_LABEL: Record<TenderStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

export const TENDER_STATUS_TAG: Record<TenderStatus, TagColor> = {
  DRAFT: "cool-gray",
  OPEN: "blue",
  CLOSED: "purple",
  AWARDED: "green",
  CANCELLED: "gray",
};

export const TENDER_STATUS_TRANSITIONS: Record<TenderStatus, readonly TenderStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["CLOSED", "CANCELLED"],
  CLOSED: ["AWARDED", "OPEN"],
  AWARDED: [],
  CANCELLED: [],
};

export function canTransitionTenderStatus(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = TENDER_STATUS_TRANSITIONS[from as TenderStatus];
  return !!allowed && allowed.includes(to as TenderStatus);
}

/** Bids stay sealed from the firm until the tender is CLOSED or AWARDED. */
export function tenderBidsVisibleToFirm(status: string): boolean {
  return status === "CLOSED" || status === "AWARDED";
}

export const TenderInvitationStatus = z.enum([
  "INVITED",
  "VIEWED",
  "SUBMITTED",
  "DECLINED",
  "WITHDRAWN",
]);
export type TenderInvitationStatus = z.infer<typeof TenderInvitationStatus>;

export const TENDER_INVITATION_STATUS_LABEL: Record<TenderInvitationStatus, string> = {
  INVITED: "Invited",
  VIEWED: "Viewed",
  SUBMITTED: "Submitted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export const TENDER_INVITATION_STATUS_TAG: Record<TenderInvitationStatus, TagColor> = {
  INVITED: "blue",
  VIEWED: "cyan",
  SUBMITTED: "green",
  DECLINED: "gray",
  WITHDRAWN: "cool-gray",
};

export const TenderCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(240),
  category: z.string().max(120).optional(),
  scope: z.string().max(8000).optional(),
  dueDate: z.string().date().optional(),
  instructions: z.string().max(8000).optional(),
});
export type TenderCreate = z.infer<typeof TenderCreate>;

export const TenderUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).max(240).optional(),
  category: z.string().max(120).nullable().optional(),
  scope: z.string().max(8000).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  instructions: z.string().max(8000).nullable().optional(),
});
export type TenderUpdate = z.infer<typeof TenderUpdate>;

export const TenderSetStatus = z.object({
  id: z.string().uuid(),
  status: TenderStatus,
});
export type TenderSetStatus = z.infer<typeof TenderSetStatus>;

export const TenderInvite = z.object({
  tenderId: z.string().uuid(),
  contractorId: z.string().uuid(),
});
export type TenderInvite = z.infer<typeof TenderInvite>;

export const TenderAward = z.object({
  tenderId: z.string().uuid(),
  contractorId: z.string().uuid(),
});
export type TenderAward = z.infer<typeof TenderAward>;

export const TenderBidSubmit = z.object({
  invitationId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  completionWeeks: z.number().int().positive().max(520).optional(),
  notes: z.string().max(4000).optional(),
});
export type TenderBidSubmit = z.infer<typeof TenderBidSubmit>;
