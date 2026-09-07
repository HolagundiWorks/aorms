"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import {
  MasonryFields,
  PlasterFields,
  PaintingFields,
  OpeningFields,
  DeductRule,
  WallUnitType,
} from "../takeoff/formulas";

/**
 * Project take-off Server Actions — see web/lib/takeoff/formulas.ts and
 * migration 0027_project_takeoff.sql for what this is and deliberately
 * isn't (masonry/plaster/painting/doors/windows only).
 */

export type TakeoffActionState = { error: string } | null;

function num(formData: FormData, name: string): number {
  const raw = String(formData.get(name) ?? "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function bool(formData: FormData, name: string): boolean {
  return str(formData, name) === "on" || str(formData, name).toLowerCase() === "true";
}

export async function createTakeoffItem(
  _prev: TakeoffActionState,
  formData: FormData,
): Promise<TakeoffActionState> {
  const projectId = str(formData, "projectId");
  const category = str(formData, "category");
  const mark = str(formData, "mark");
  const wallMark = str(formData, "wallMark") || null;
  const notes = str(formData, "notes") || null;

  if (!projectId) return { error: "Project is required." };
  if (!mark) return { error: "Mark is required." };

  let fields: Record<string, unknown>;

  switch (category) {
    case "MASONRY": {
      const parsed = MasonryFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        unitType: (str(formData, "unitType") || undefined) as WallUnitType | undefined,
        blockSize: str(formData, "blockSize") || undefined,
        mortarMix: str(formData, "mortarMix") || undefined,
      });
      if (!parsed.success) return { error: "Check the masonry dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "PLASTER": {
      const parsed = PlasterFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        mortarMix: str(formData, "mortarMix") || undefined,
        faces: num(formData, "faces") || undefined,
        addJambs: bool(formData, "addJambs"),
      });
      if (!parsed.success) return { error: "Check the plaster dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "PAINTING": {
      const parsed = PaintingFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        paintType: str(formData, "paintType") || undefined,
        coats: num(formData, "coats") || undefined,
        faces: num(formData, "faces") || undefined,
        addJambs: bool(formData, "addJambs"),
      });
      if (!parsed.success) return { error: "Check the painting dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "DOOR":
    case "WINDOW": {
      const parsed = OpeningFields.safeParse({
        widthMm: num(formData, "widthMm"),
        heightMm: num(formData, "heightMm"),
        nos: num(formData, "nos") || undefined,
        deductFromWall: formData.has("deductFromWall") ? bool(formData, "deductFromWall") : undefined,
      });
      if (!parsed.success) return { error: "Check the opening dimensions — width/height must be positive numbers." };
      if (!wallMark) return { error: "Wall mark is required for a door/window (which wall it deducts from)." };
      fields = parsed.data;
      break;
    }
    default:
      return { error: "Unknown category." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("takeoff_items").insert({
    project_id: projectId,
    category,
    mark,
    wall_mark: wallMark,
    fields,
    notes,
  });
  if (error) return { error: error.message };

  revalidatePath(`/takeoff/${projectId}`);
  return null;
}

export async function deleteTakeoffItem(itemId: string, projectId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("takeoff_items").delete().eq("id", itemId);
  revalidatePath(`/takeoff/${projectId}`);
}
