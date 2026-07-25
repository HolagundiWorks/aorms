/**
 * Running / RA bills — architect certification of contractor bills.
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
  jsonb,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const runningBills = pgTable("esti_running_bill", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id").references(() => contractors.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  billType: text("bill_type").notNull().default("RA"),
  status: text("status").notNull().default("DRAFT"),
  measurementDate: date("measurement_date"),
  notes: text("notes"),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  retentionPaise: bigint("retention_paise", { mode: "number" }).notNull().default(0),
  advanceRecoveryPaise: bigint("advance_recovery_paise", { mode: "number" })
    .notNull()
    .default(0),
  taxTdsPaise: bigint("tax_tds_paise", { mode: "number" }).notNull().default(0),
  otherRecoveryPaise: bigint("other_recovery_paise", { mode: "number" }).notNull().default(0),
  netPayablePaise: bigint("net_payable_paise", { mode: "number" }).notNull().default(0),
  statusHistory: jsonb("status_history").$type<unknown[]>().notNull().default([]),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const runningBillItems = pgTable("esti_running_bill_item", {
  id: id(),
  runningBillId: uuid("running_bill_id")
    .notNull()
    .references(() => runningBills.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  previousBilledQty: doublePrecision("previous_billed_qty").notNull().default(0),
  cumulativeBilledQty: doublePrecision("cumulative_billed_qty").notNull().default(0),
  createdAt: createdAt(),
});
