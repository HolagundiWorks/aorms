/**
 * Project Bar Bending Schedule — consultancy checking / GFC quantities.
 * Schedule + geometry members + computed/manual bar lines.
 */
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";
import {
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const bbsSchedules = pgTable("esti_bbs", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Geometry inputs that feed the cutting-length engine. */
export const bbsMembers = pgTable("esti_bbs_member", {
  id: id(),
  bbsId: uuid("bbs_id")
    .notNull()
    .references(() => bbsSchedules.id, { onDelete: "cascade" }),
  element: text("element").notNull(),
  mark: text("mark"),
  input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Schedule lines (manual or generated from a member). */
export const bbsItems = pgTable("esti_bbs_item", {
  id: id(),
  bbsId: uuid("bbs_id")
    .notNull()
    .references(() => bbsSchedules.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => bbsMembers.id, { onDelete: "cascade" }),
  barMark: text("bar_mark").notNull(),
  member: text("member"),
  element: text("element"),
  role: text("role"),
  diaMm: doublePrecision("dia_mm").notNull(),
  noOfMembers: integer("no_of_members").notNull().default(1),
  barsPerMember: integer("bars_per_member").notNull().default(1),
  cuttingLengthMm: doublePrecision("cutting_length_mm").notNull(),
  weightKg: doublePrecision("weight_kg").notNull().default(0),
  floor: text("floor"),
  shape: text("shape"),
  createdAt: createdAt(),
});
