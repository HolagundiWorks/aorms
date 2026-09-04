import {
  FREE_DESKTOP_CAPABILITIES,
  LICENSED_DESKTOP_CAPABILITIES,
  type RuntimeCapabilities,
  type RuntimeHost,
  WEB_PARITY_CAPABILITIES,
} from "@esti/contracts";
import { useAuth } from "./auth.js";
import { isNativeDesktopShell } from "./desktopNativeBridge.js";
import { trpc } from "./trpc.js";

/**
 * Web parity / desktop capability matrix.
 *
 * Build-time: `VITE_RUNTIME_HOST=desktop|web` (desktop shell sets this).
 * Runtime: `trpc.sync.capabilities` is authoritative when signed in.
 *
 * AI Local vs Hosted badges key off the **client** host (`buildTimeHost`), not
 * the hub process — a browser SPA against `ESTI_ROLE=hub` still shows Hosted AI.
 */

export type AiComputeLocation = "local" | "hosted";

export function buildTimeHost(): RuntimeHost {
  const h = import.meta.env.VITE_RUNTIME_HOST;
  if (h === "desktop" || h === "hub") return h;
  return "web";
}

/**
 * True when this SPA is the desktop node (Vite desktop host or WinUI WebView2).
 * Use before mounting licence bind, offline sync tray, or native menu bridge.
 */
export function isDesktopClient(): boolean {
  return buildTimeHost() === "desktop" || isNativeDesktopShell();
}

/** Static fallback before the capabilities query resolves. */
export function defaultCapabilities(): RuntimeCapabilities {
  const host = buildTimeHost();
  if (host === "desktop") return { ...FREE_DESKTOP_CAPABILITIES };
  if (host === "hub") return { ...WEB_PARITY_CAPABILITIES, host: "hub" };
  return { ...WEB_PARITY_CAPABILITIES };
}

/**
 * Where AI compute runs for this SPA host (LF5 badge).
 * Desktop + server `localAi` → Local; otherwise Hosted (hub / BYO).
 */
export function resolveAiCompute(
  clientHost: RuntimeHost,
  localAi: boolean,
): AiComputeLocation {
  return clientHost === "desktop" && localAi ? "local" : "hosted";
}

/**
 * Hook: live capabilities from the backend (degrades AI/worker on web parity;
 * enables meta/artifact sync when licensed + hub-bound).
 */
export function useRuntimeCapabilities() {
  const { user } = useAuth();
  const clientHost = buildTimeHost();
  const q = trpc.sync.capabilities.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    staleTime: 60_000,
  });
  const caps: RuntimeCapabilities = q.data ?? defaultCapabilities();
  const aiCompute = resolveAiCompute(clientHost, caps.localAi);
  return {
    ...caps,
    /** Server-reported host (may be `hub` for cloud API). */
    host: q.data?.host ?? clientHost,
    /** SPA build host — use for Local/Hosted AI chrome. */
    clientHost,
    aiCompute,
    isLoading: q.isLoading,
    /** Web / unbound: local Ollama unavailable on this machine. */
    aiDegraded: aiCompute === "hosted",
    /** Web: heavy jobs run on hub worker, not the browser machine. */
    workerDegraded: clientHost !== "desktop" || !caps.localWorker,
    canOfflineAuthor: caps.offlineAuthoring,
    licensedDesktopSync:
      clientHost === "desktop" && caps.metaSync && caps.artifactSync
        ? LICENSED_DESKTOP_CAPABILITIES
        : null,
  };
}

/** Sync / offline queue strip for app chrome (pending artifact + meta counts). Desktop only. */
export function useSyncStatus() {
  const { user } = useAuth();
  const desktop = isDesktopClient();
  const q = trpc.sync.status.useQuery(undefined, {
    enabled: Boolean(user) && desktop,
    retry: false,
    refetchInterval: 30_000,
  });
  const pending = (q.data?.pending ?? 0) + (q.data?.metaPending ?? 0);
  const failed = q.data?.failed ?? 0;
  return {
    ...q,
    pending,
    failed,
    hubConfigured: q.data?.hubConfigured ?? false,
    metaLastSeq: q.data?.metaLastSeq ?? null,
    hasOfflineQueue: pending > 0 || failed > 0,
  };
}
