import {
  FREE_DESKTOP_CAPABILITIES,
  LICENSED_DESKTOP_CAPABILITIES,
  type RuntimeCapabilities,
  WEB_PARITY_CAPABILITIES,
} from "@esti/contracts";
import { env } from "../../env.js";
import { licenseState } from "../plan.js";
import { getOrgSettings } from "../settings.js";

/**
 * Resolve runtime capabilities for this install (desktop node vs web/hub parity).
 * Free/unlicensed desktop keeps local AI/worker but does not sync to the hub.
 *
 * LF5: non-desktop node processes keep `WEB_PARITY` localAi/localWorker=false
 * (AI/worker on hub or BYO). Hub processes report local AI/worker true for the
 * server; the SPA still badges Hosted via `VITE_RUNTIME_HOST=web`.
 *
 * Desktop meta/artifact sync also requires a persisted `syncToken` (issued at
 * panel activate / catch-up refresh). Caps stay false until bind completes so
 * `sync.flush` / `sync.pullMeta` match what the UI advertises.
 */
export async function resolveRuntimeCapabilities(
  db: Parameters<typeof licenseState>[0],
): Promise<RuntimeCapabilities> {
  const hubConfigured = Boolean(env.ESTI_HUB_URL);
  if (env.ESTI_ROLE === "hub") {
    return {
      ...WEB_PARITY_CAPABILITIES,
      host: "hub",
      localAi: true,
      localWorker: true,
      metaSync: true,
      artifactSync: true,
    };
  }

  const looksDesktop =
    Boolean(env.INSTALL_ID) || env.STORAGE_DRIVER === "fs" || env.ESTI_DESKTOP;

  if (!looksDesktop) {
    return {
      ...WEB_PARITY_CAPABILITIES,
      metaSync: hubConfigured,
      artifactSync: hubConfigured,
    };
  }

  const lic = await licenseState(db).catch(() => null);
  const { syncToken } = await getOrgSettings(db).catch(() => ({ syncToken: null as string | null }));
  const licensed = Boolean(
    lic &&
      lic.managed &&
      (lic.status === "VALID" || lic.status === "GRACE") &&
      hubConfigured,
  );
  const syncEnabled = licensed && Boolean(syncToken);
  const base = licensed ? LICENSED_DESKTOP_CAPABILITIES : FREE_DESKTOP_CAPABILITIES;
  return {
    ...base,
    localAi: true,
    localWorker: true,
    metaSync: syncEnabled,
    artifactSync: syncEnabled,
  };
}
