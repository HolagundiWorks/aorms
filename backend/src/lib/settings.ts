import { TRPCError } from "@trpc/server";
import type { DB } from "../db/index.js";
import { orgSettings } from "../db/schema.js";

/**
 * Read the singleton org-settings row, creating it on first access.
 *
 * Desktop-first AI is local-only: there is no BYO cloud API key to decrypt.
 * Any legacy sealed `cloudApiKey` still stored in ai_settings is ignored and
 * stripped by `normalizeAiSettingsRaw` when the settings are parsed.
 */
export async function getOrgSettings(db: DB): Promise<typeof orgSettings.$inferSelect> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (row) {
    if (!row.hrEnabled || row.orgMode !== "STUDIO") {
      const [updated] = await db
        .update(orgSettings)
        .set({ hrEnabled: true, orgMode: "STUDIO", updatedAt: new Date() })
        .returning();
      return updated!;
    }
    return row;
  }
  const [created] = await db.insert(orgSettings).values({ hrEnabled: true, orgMode: "STUDIO" }).returning();
  return created!;
}

/** Guard write paths in the optional HR module — reject if it is toggled off. */
export async function requireHrEnabled(db: DB): Promise<void> {
  const s = await getOrgSettings(db);
  if (!s.hrEnabled)
    throw new TRPCError({ code: "FORBIDDEN", message: "Team & HR module is disabled" });
}

