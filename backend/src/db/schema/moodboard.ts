/**
 * AStudio project moodboards — freeform canvas of images, sticky notes, and
 * pen paths for project collaboration / discussion.
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

export type MoodboardItemPayload = Record<string, unknown>;

export const moodboards = pgTable("esti_moodboard", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  canvasWidth: integer("canvas_width").notNull().default(1920),
  canvasHeight: integer("canvas_height").notNull().default(1080),
  background: text("background").notNull().default("#F2F4F7"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const moodboardItems = pgTable("esti_moodboard_item", {
  id: id(),
  moodboardId: uuid("moodboard_id")
    .notNull()
    .references(() => moodboards.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  x: doublePrecision("x").notNull().default(0),
  y: doublePrecision("y").notNull().default(0),
  width: doublePrecision("width"),
  height: doublePrecision("height"),
  rotation: doublePrecision("rotation").notNull().default(0),
  zIndex: integer("z_index").notNull().default(0),
  payload: jsonb("payload").$type<MoodboardItemPayload>().notNull().default({}),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
