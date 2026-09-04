/**
 * @deprecated Desktop installers removed (2026-09).
 * AORMS is now a web-only office management system.
 * No desktop apps (Connect, AStudio, AConsulting, AProc, ADraft).
 * Use the web hub at aorms.in/login.
 */

export type DesktopInstallerApp = "astudio" | "aconsulting";

export type DesktopInstallerStatus = "web_fallback" | "available" | "coming_soon";

export type DesktopUpdateManifest = {
  app: DesktopInstallerApp;
  product: string;
  channel?: string;
  platform?: string;
  version?: string;
  url?: string;
  sha256?: string;
  sizeBytes?: number;
  signature?: string;
  publishedAt?: string;
  status?: DesktopInstallerStatus | string;
  notes?: string;
};

export type DesktopInstallerOffer = {
  app: DesktopInstallerApp;
  title: string;
  expansion: string;
  webUrl: string;
  downloadUrl: string | null;
  version: string | null;
  sha256: string | null;
  status: DesktopInstallerStatus;
  fallbackReason: string;
  manifestPath: string;
};

/**
 * @deprecated No-op stub. Desktop installers removed.
 */
export function resolveInstallerOffer(app: DesktopInstallerApp): DesktopInstallerOffer {
  return {
    app,
    title: "Desktop app (removed)",
    expansion: "Removed",
    webUrl: "https://aorms.in/login",
    downloadUrl: null,
    version: null,
    sha256: null,
    status: "web_fallback",
    fallbackReason: "Desktop installers removed (2026-09). Use web hub at aorms.in/login.",
    manifestPath: "/update-manifests/removed",
  };
}

/**
 * @deprecated No-op stub. Desktop installers removed.
 */
export async function fetchUpdateManifest(app: DesktopInstallerApp): Promise<null> {
  return null;
}

/**
 * @deprecated No-op stub. Desktop installers removed.
 */
export async function loadDesktopInstallerOffers(): Promise<DesktopInstallerOffer[]> {
  return [];
}
