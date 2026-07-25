/**
 * Bid desk — firm-as-bidder RFP / tender opportunities.
 * Not contractor tendering (`esti_tender*` was dropped in 0117).
 */
import { clients, users } from "./org-auth.js";
import { leads } from "./project-os.js";
import { projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  id,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const bidOpportunities = pgTable("esti_bid_opportunity", {
  id: id(),
  ref: text("ref").notNull().unique(),
  title: text("title").notNull(),
  /** Issuing authority / client named on the notice. */
  issuerName: text("issuer_name").notNull(),
  /** Tender / RFP / GeM reference number. */
  referenceNo: text("reference_no"),
  source: text("source").notNull().default("TENDER_PORTAL"),
  portalUrl: text("portal_url"),
  submissionDueAt: timestamp("submission_due_at", { withTimezone: true }),
  emdPaise: bigint("emd_paise", { mode: "number" }),
  estimatedFeePaise: bigint("estimated_fee_paise", { mode: "number" }),
  siteLocation: text("site_location"),
  city: text("city"),
  status: text("status").notNull().default("WATCHING"),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  convertedProjectId: uuid("converted_project_id").references(() => projectOffices.id, {
    onDelete: "set null",
  }),
  convertedClientId: uuid("converted_client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  conflictCheckDone: boolean("conflict_check_done").notNull().default(false),
  conflictCheckNotes: text("conflict_check_notes"),
  lossReason: text("loss_reason"),
  notes: text("notes"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
