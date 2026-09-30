/** Display ID for a task: sequence 184 → "TASK-0184" (4-digit minimum, grows past 9999). */
export function formatTaskRef(seq: number | null | undefined): string | null {
  return seq == null ? null : `TASK-${String(seq).padStart(4, "0")}`;
}
