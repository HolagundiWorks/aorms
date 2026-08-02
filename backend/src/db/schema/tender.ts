/**
 * Project tenders — firm issues; invited contractors bid via contractor portal.
 * Replaces the 0117-dropped esti_tender* spine (lump-sum v1; no BOQ line bids).
 */
import { contractors } from "./delivery.js";
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";
import {
  bigint,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const tenders = pgTable("esti_tender", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category"),
  scope: text("scope"),
  status: text("status").notNull().default("DRAFT"),
  dueDate: date("due_date"),
  instructions: text("instructions"),
  awardedContractorId: uuid("awarded_contractor_id").references(() => contractors.id, {
    onDelete: "set null",
  }),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tenderInvitations = pgTable(
  "esti_tender_invitation",
  {
    id: id(),
    tenderId: uuid("tender_id")
      .notNull()
      .references(() => tenders.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("INVITED"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
  },
  (t) => ({
    tenderContractorUq: uniqueIndex("esti_tender_invitation_tender_contractor_uq").on(
      t.tenderId,
      t.contractorId,
    ),
  }),
);

export const tenderBids = pgTable(
  "esti_tender_bid",
  {
    id: id(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => tenderInvitations.id, { onDelete: "cascade" }),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    completionWeeks: integer("completion_weeks"),
    /** Optional staff-only score after unsealing — not set by contractors. */
    technicalScore: doublePrecision("technical_score"),
    notes: text("notes"),
    submittedById: uuid("submitted_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    invitationUq: uniqueIndex("esti_tender_bid_invitation_uq").on(t.invitationId),
  }),
);
