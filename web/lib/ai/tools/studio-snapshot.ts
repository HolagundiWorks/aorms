import { buildLiveSnapshot } from "../snapshot";
import type { AITool } from "./types";

/** Wraps the existing, already-live askEsti snapshot (lib/ai/snapshot.ts) — same 5 counts, no new query. */
export const studioSnapshotTool: AITool = {
  name: "get_studio_snapshot",
  description:
    "Get a quick count of the studio's current state: new leads, active projects, overdue tasks, open tasks, and unpaid invoices. Use for questions about overall studio health or workload.",
  parameters: { type: "object", properties: {} },
  async execute(_args, context) {
    return buildLiveSnapshot(context.supabase);
  },
};
