import {
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { contractorSubmissions, contractors, drawings } from "./delivery.js";
import { itemLibraryItems } from "./item-library.js";
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";

/** Site supervisor joint measurement session (abstract) awaiting office approval. */
export const jointMeasurements = pgTable("esti_joint_measurement", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
  sourceSubmissionId: uuid("source_submission_id").references(() => contractorSubmissions.id, {
    onDelete: "set null",
  }),
  subject: text("subject").notNull(),
  measuredOn: date("measured_on"),
  details: text("details"),
  status: text("status").notNull().default("DRAFT"),
  attentionToId: uuid("attention_to_id").references(() => users.id, { onDelete: "set null" }),
  submittedById: uuid("submitted_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const jointMeasurementLines = pgTable("esti_joint_measurement_line", {
  id: id(),
  jointMeasurementId: uuid("joint_measurement_id")
    .notNull()
    .references(() => jointMeasurements.id, { onDelete: "cascade" }),
  code: text("code"),
  description: text("description").notNull(),
  uom: text("uom").notNull(),
  /** L | LB | LBH | COUNT — drives quantity derivation. */
  measureKind: text("measure_kind").notNull().default("LBH"),
  lengthMm: integer("length_mm"),
  breadthMm: integer("breadth_mm"),
  heightMm: integer("height_mm"),
  countNos: doublePrecision("count_nos").notNull().default(1),
  quantity: doublePrecision("quantity").notNull().default(0),
  itemLibraryItemId: uuid("item_library_item_id").references(() => itemLibraryItems.id, {
    onDelete: "set null",
  }),
  drawingId: uuid("drawing_id").references(() => drawings.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Freeform PDF review marks on a joint measurement (pen / highlight / pin / cloud). */
export const jointMeasurementAnnotations = pgTable("esti_joint_measurement_annotation", {
  id: id(),
  jointMeasurementId: uuid("joint_measurement_id")
    .notNull()
    .references(() => jointMeasurements.id, { onDelete: "cascade" }),
  drawingId: uuid("drawing_id")
    .notNull()
    .references(() => drawings.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  pageNo: integer("page_no").notNull().default(0),
  color: text("color").notNull().default("#FF4F18"),
  label: text("label"),
  geometry: jsonb("geometry").notNull().default({}),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
