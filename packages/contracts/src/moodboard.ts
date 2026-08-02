import { z } from "zod";

/**
 * AStudio project moodboards — Canva-like freeform canvas for images, sticky
 * notes, and pen markup. Collaboration / discussion attaches via comments
 * (`objectType: moodboard` | `moodboard_item`).
 */

export const MoodboardItemKind = z.enum(["IMAGE", "STICKY", "PATH"]);
export type MoodboardItemKind = z.infer<typeof MoodboardItemKind>;

export const MOODBOARD_ITEM_KIND_LABEL: Record<MoodboardItemKind, string> = {
  IMAGE: "Image",
  STICKY: "Sticky note",
  PATH: "Drawing",
};

export const MoodboardPoint = z.object({
  x: z.number(),
  y: z.number(),
});
export type MoodboardPoint = z.infer<typeof MoodboardPoint>;

export const MoodboardImagePayload = z.object({
  storageKey: z.string().min(1),
  caption: z.string().max(500).nullable().optional(),
  fileName: z.string().max(260).optional(),
});
export type MoodboardImagePayload = z.infer<typeof MoodboardImagePayload>;

export const MoodboardStickyPayload = z.object({
  text: z.string().max(4000).default(""),
  color: z.string().min(1).max(32).default("#FFF59D"),
});
export type MoodboardStickyPayload = z.infer<typeof MoodboardStickyPayload>;

export const MoodboardPathPayload = z.object({
  points: z.array(MoodboardPoint).min(2),
  stroke: z.string().min(1).max(32).default("#141517"),
  strokeWidth: z.number().positive().max(64).default(3),
});
export type MoodboardPathPayload = z.infer<typeof MoodboardPathPayload>;

export const MoodboardItemPayload = z.union([
  MoodboardImagePayload,
  MoodboardStickyPayload,
  MoodboardPathPayload,
]);
export type MoodboardItemPayload = z.infer<typeof MoodboardItemPayload>;

export const STICKY_NOTE_COLORS = [
  "#FFF59D",
  "#FFCC80",
  "#C5E1A5",
  "#B3E5FC",
  "#F8BBD0",
  "#E1BEE7",
] as const;

export const MoodboardCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  canvasWidth: z.number().int().min(640).max(8192).optional(),
  canvasHeight: z.number().int().min(480).max(8192).optional(),
  background: z.string().min(1).max(32).optional(),
});
export type MoodboardCreate = z.infer<typeof MoodboardCreate>;

export const MoodboardUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  canvasWidth: z.number().int().min(640).max(8192).optional(),
  canvasHeight: z.number().int().min(480).max(8192).optional(),
  background: z.string().min(1).max(32).optional(),
});
export type MoodboardUpdate = z.infer<typeof MoodboardUpdate>;

export const MoodboardItemUpsert = z.object({
  moodboardId: z.string().uuid(),
  id: z.string().uuid().optional(),
  kind: MoodboardItemKind,
  x: z.number(),
  y: z.number(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  rotation: z.number().optional(),
  zIndex: z.number().int().optional(),
  payload: z.record(z.string(), z.unknown()),
});
export type MoodboardItemUpsert = z.infer<typeof MoodboardItemUpsert>;

export const MoodboardItemTransform = z.object({
  id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  rotation: z.number().optional(),
  zIndex: z.number().int().optional(),
});
export type MoodboardItemTransform = z.infer<typeof MoodboardItemTransform>;
