/**
 * Steel reconciliation — scheduled (BBS) vs issued vs consumed by diameter.
 */
import { bbsSchedules } from "./bbs.js";
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";
import {
  createdAt,
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

export const steelReconciliations = pgTable("esti_steel_reconciliation", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  bbsId: uuid("bbs_id").references(() => bbsSchedules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"),
  notes: text("notes"),
  scheduledKg: doublePrecision("scheduled_kg").notNull().default(0),
  issuedKg: doublePrecision("issued_kg").notNull().default(0),
  consumedKg: doublePrecision("consumed_kg").notNull().default(0),
  wastageKg: doublePrecision("wastage_kg").notNull().default(0),
  finalizedById: uuid("finalized_by_id").references(() => users.id, { onDelete: "set null" }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const steelReconciliationItems = pgTable(
  "esti_steel_reconciliation_item",
  {
    id: id(),
    reconciliationId: uuid("reconciliation_id")
      .notNull()
      .references(() => steelReconciliations.id, { onDelete: "cascade" }),
    diaMm: doublePrecision("dia_mm").notNull(),
    scheduledKg: doublePrecision("scheduled_kg").notNull().default(0),
    issuedKg: doublePrecision("issued_kg").notNull().default(0),
    consumedKg: doublePrecision("consumed_kg").notNull().default(0),
    wastageKg: doublePrecision("wastage_kg").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => ({
    diaUq: uniqueIndex("esti_steel_recon_item_dia_uq").on(t.reconciliationId, t.diaMm),
  }),
);
