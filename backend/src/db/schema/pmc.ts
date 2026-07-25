import { contractors } from "./delivery.js";
import { users } from "./org-auth.js";
import { phases, projectOffices } from "./project.js";
import {
  bigint,
  createdAt,
  date,
  id,
  integer,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const snags = pgTable("esti_snag", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  location: text("location"),
  trade: text("trade"),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"],
  })
    .notNull()
    .default("OPEN"),
  photoKey: text("photo_key"),
  contractorSubmissionId: uuid("contractor_submission_id"),
  dueDate: date("due_date"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const siteInstructions = pgTable("esti_site_instruction", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id").references(() => contractors.id, {
    onDelete: "set null",
  }),
  subject: text("subject").notNull(),
  body: text("body"),
  issuedAt: date("issued_at"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const progressReports = pgTable("esti_progress_report", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  narrative: text("narrative"),
  physicalProgressPct: integer("physical_progress_pct"),
  scheduleProgressPct: integer("schedule_progress_pct"),
  openSnagCount: integer("open_snag_count").notNull().default(0),
  openRfiCount: integer("open_rfi_count").notNull().default(0),
  status: text("status", { enum: ["DRAFT", "ISSUED"] })
    .notNull()
    .default("DRAFT"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** APBF Layer 2 live progress stages within a delivery phase. */
export const phaseProgress = pgTable("esti_phase_progress", {
  id: id(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  liveStageCode: text("live_stage_code").notNull(),
  label: text("label").notNull(),
  status: text("status", {
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"],
  })
    .notNull()
    .default("NOT_STARTED"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * AProc master programme milestone — client reporting / governance.
 * Not a contractor CPM activity network (see docs/esti/APROC-ARCHITECTURE.md).
 */
export const pmcMilestones = pgTable("esti_pmc_milestone", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  title: text("title").notNull(),
  plannedDate: date("planned_date"),
  actualDate: date("actual_date"),
  percentComplete: integer("percent_complete").notNull().default(0),
  status: text("status", {
    enum: ["PLANNED", "ON_TRACK", "AT_RISK", "DELAYED", "COMPLETE"],
  })
    .notNull()
    .default("PLANNED"),
  /** Optional external baseline id (MSP/P6 activity code) — import later. */
  baselineRef: text("baseline_ref"),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * AProc work / tender package — owner-side register.
 * Firm does not bid; contractor portal handles bidding (Wave 2.3+).
 */
export const pmcPackages = pgTable("esti_pmc_package", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  title: text("title").notNull(),
  trade: text("trade"),
  status: text("status", {
    enum: ["DRAFT", "TENDERING", "AWARDED", "IN_PROGRESS", "COMPLETE", "CANCELLED"],
  })
    .notNull()
    .default("DRAFT"),
  contractorId: uuid("contractor_id").references(() => contractors.id, {
    onDelete: "set null",
  }),
  contractValuePaise: bigint("contract_value_paise", { mode: "number" }),
  tenderCloseDate: date("tender_close_date"),
  awardDate: date("award_date"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
