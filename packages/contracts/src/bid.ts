import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * Bid desk — RFP / tender opportunities the **practice is pursuing**
 * (firm-as-bidder). Not contractor tendering (issue / sealed bids / award),
 * which was removed in the 2026-06 consultancy-only teardown.
 *
 * Typical path: capture tender → prepare submission → submit → won/lost.
 * On win, open a Lead (or link an existing one) and continue into Proposals.
 */

export const BidSource = z.enum([
  "TENDER_PORTAL",
  "GOVERNMENT_RFP",
  "PRIVATE_RFP",
  "EOI",
  "INVITED",
  "OTHER",
]);
export type BidSource = z.infer<typeof BidSource>;

export const BID_SOURCE_LABEL: Record<BidSource, string> = {
  TENDER_PORTAL: "Tender portal",
  GOVERNMENT_RFP: "Government RFP",
  PRIVATE_RFP: "Private RFP",
  EOI: "EOI / PQ",
  INVITED: "Invited bid",
  OTHER: "Other",
};

export const BidStatus = z.enum([
  "WATCHING",
  "REVIEWING",
  "PREPARING",
  "SUBMITTED",
  "SHORTLISTED",
  "WON",
  "LOST",
  "WITHDRAWN",
]);
export type BidStatus = z.infer<typeof BidStatus>;

export const BID_STATUS_LABEL: Record<BidStatus, string> = {
  WATCHING: "Watching",
  REVIEWING: "Reviewing",
  PREPARING: "Preparing",
  SUBMITTED: "Submitted",
  SHORTLISTED: "Shortlisted",
  WON: "Won",
  LOST: "Lost",
  WITHDRAWN: "Withdrawn",
};

export const BID_STATUS_TAG: Record<BidStatus, TagColor> = {
  WATCHING: "cool-gray",
  REVIEWING: "blue",
  PREPARING: "purple",
  SUBMITTED: "cyan",
  SHORTLISTED: "teal",
  WON: "green",
  LOST: "red",
  WITHDRAWN: "gray",
};

/** Closed outcomes — status still editable only via withdraw/lost corrections. */
export const BID_TERMINAL_STATUSES: ReadonlySet<BidStatus> = new Set<BidStatus>([
  "WON",
  "LOST",
  "WITHDRAWN",
]);

export const BID_STATUS_TRANSITIONS: Record<BidStatus, readonly BidStatus[]> = {
  WATCHING: ["REVIEWING", "PREPARING", "WITHDRAWN"],
  REVIEWING: ["PREPARING", "WATCHING", "WITHDRAWN", "LOST"],
  PREPARING: ["SUBMITTED", "REVIEWING", "WITHDRAWN", "LOST"],
  SUBMITTED: ["SHORTLISTED", "WON", "LOST", "WITHDRAWN"],
  SHORTLISTED: ["WON", "LOST", "WITHDRAWN"],
  WON: [],
  LOST: [],
  WITHDRAWN: [],
};

export function canTransitionBidStatus(
  from: BidStatus | string,
  to: BidStatus | string,
): boolean {
  if (from === to) return true;
  const allowed = BID_STATUS_TRANSITIONS[from as BidStatus];
  return !!allowed && allowed.includes(to as BidStatus);
}

export const BidCreate = z.object({
  title: z.string().min(2).max(240),
  issuerName: z.string().min(1).max(200),
  referenceNo: z.string().max(120).optional(),
  source: BidSource.default("TENDER_PORTAL"),
  /** Portal / notice URL — validated loosely (firms paste GeM / state portal links). */
  portalUrl: z.string().max(500).optional(),
  /** ISO date or datetime for submission deadline. */
  submissionDueAt: z.string().max(40).optional(),
  /** EMD / bid security in integer paise. */
  emdPaise: z.number().int().nonnegative().nullable().optional(),
  estimatedFeePaise: z.number().int().nonnegative().nullable().optional(),
  siteLocation: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  leadId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).optional(),
});
export type BidCreate = z.infer<typeof BidCreate>;

export const BidUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).max(240).optional(),
  issuerName: z.string().min(1).max(200).optional(),
  referenceNo: z.string().max(120).nullable().optional(),
  source: BidSource.optional(),
  portalUrl: z.string().max(500).nullable().optional(),
  submissionDueAt: z.string().max(40).nullable().optional(),
  emdPaise: z.number().int().nonnegative().nullable().optional(),
  estimatedFeePaise: z.number().int().nonnegative().nullable().optional(),
  siteLocation: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});
export type BidUpdate = z.infer<typeof BidUpdate>;

export const BidSetStatus = z.object({
  id: z.string().uuid(),
  status: BidStatus,
  lossReason: z.string().max(2000).optional(),
});
export type BidSetStatus = z.infer<typeof BidSetStatus>;

/**
 * Open a Studio lead from a bid so the win path continues into proposals /
 * project conversion without inventing a second acquisition funnel.
 */
export const BidOpenAsLead = z.object({
  id: z.string().uuid(),
  conflictCheckDone: z.boolean(),
  conflictCheckNotes: z.string().max(2000).optional(),
});
export type BidOpenAsLead = z.infer<typeof BidOpenAsLead>;
