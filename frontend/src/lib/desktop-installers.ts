/**
 * Desktop installer resolution for the public `/downloads` portal.
 *
 * Honesty rule: never offer a download button until a **signed** URL is wired.
 * Placeholders stay in `web_fallback` until Bhoomi publishes a **signed**
 * installer URL + sha256 (see docs/esti/WEB-PORTAL.md). Never wire
 * `desktop/artifacts/` unsigned overnight builds.
 */
import {
  AORMS_CONSULTANCY,
  AORMS_STUDIO,
} from "./product-nomenclature.js";

export type DesktopInstallerApp = "astudio" | "aconsulting";

export type DesktopInstallerStatus =
  | "web_fallback"
  | "available"
  | "coming_soon";

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
  /** Absolute or site-relative URL when a signed installer is live. */
  downloadUrl: string | null;
  version: string | null;
  sha256: string | null;
  status: DesktopInstallerStatus;
  /** Human reason when download is withheld. */
  fallbackReason: string;
  manifestPath: string;
};

const MANIFEST_PATH: Record<DesktopInstallerApp, string> = {
  astudio: "/update-manifests/astudio.json",
  aconsulting: "/update-manifests/aconsulting.json",
};

function envFlagTrue(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function looksLikeHttpsOrSitePath(url: string): boolean {
  const t = url.trim();
  return t.startsWith("https://") || t.startsWith("/");
}

function looksLikeSha256(sha: string | undefined): boolean {
  return !!sha && /^[0-9a-f]{64}$/i.test(sha.trim());
}

function envInstallerUrl(app: DesktopInstallerApp): string | undefined {
  if (app === "astudio") {
    return (import.meta.env.VITE_ASTUDIO_INSTALLER_URL as string | undefined)?.trim();
  }
  return (import.meta.env.VITE_ACONSULTING_INSTALLER_URL as string | undefined)?.trim();
}

function useReleaseInstallers(): boolean {
  return envFlagTrue(
    import.meta.env.VITE_PORTAL_USE_RELEASE_INSTALLERS as string | undefined,
  );
}

/**
 * Resolve a single app offer from a fetched (or placeholder) manifest + build env.
 * Env URL wins when set; otherwise manifest URL is used only when
 * `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` and status is `available` with sha256.
 */
export function resolveInstallerOffer(
  app: DesktopInstallerApp,
  manifest?: DesktopUpdateManifest | null,
): DesktopInstallerOffer {
  const meta =
    app === "astudio"
      ? { title: AORMS_STUDIO.title, expansion: AORMS_STUDIO.expansion, webUrl: AORMS_STUDIO.appUrl }
      : {
          title: AORMS_CONSULTANCY.title,
          expansion: AORMS_CONSULTANCY.expansion,
          webUrl: AORMS_CONSULTANCY.appUrl,
        };

  const envUrl = envInstallerUrl(app);
  const manifestUrl = (manifest?.url ?? "").trim();
  const sha = (manifest?.sha256 ?? "").trim() || null;
  const version = (manifest?.version ?? "").trim() || null;
  const manifestStatus = (manifest?.status ?? "web_fallback") as DesktopInstallerStatus;

  // Explicit env override (operator one-line fill after Bhoomi signs).
  if (envUrl && looksLikeHttpsOrSitePath(envUrl)) {
    return {
      app,
      title: meta.title,
      expansion: meta.expansion,
      webUrl: meta.webUrl,
      downloadUrl: envUrl,
      version,
      sha256: sha,
      status: "available",
      fallbackReason: "",
      manifestPath: MANIFEST_PATH[app],
    };
  }

  // Manifest path — gated so empty/placeholder JSON never becomes a live CTA.
  if (
    useReleaseInstallers() &&
    manifestStatus === "available" &&
    manifestUrl &&
    looksLikeHttpsOrSitePath(manifestUrl) &&
    looksLikeSha256(sha ?? undefined)
  ) {
    return {
      app,
      title: meta.title,
      expansion: meta.expansion,
      webUrl: meta.webUrl,
      downloadUrl: manifestUrl,
      version,
      sha256: sha,
      status: "available",
      fallbackReason: "",
      manifestPath: MANIFEST_PATH[app],
    };
  }

  return {
    app,
    title: meta.title,
    expansion: meta.expansion,
    webUrl: meta.webUrl,
    downloadUrl: null,
    version,
    sha256: sha,
    status: "web_fallback",
    fallbackReason:
      "Signed Windows installer not published yet — use the web workspace (same SPA, same Standard licence).",
    manifestPath: MANIFEST_PATH[app],
  };
}

export async function fetchUpdateManifest(
  app: DesktopInstallerApp,
): Promise<DesktopUpdateManifest | null> {
  try {
    const res = await fetch(MANIFEST_PATH[app], { credentials: "omit" });
    if (!res.ok) return null;
    return (await res.json()) as DesktopUpdateManifest;
  } catch {
    return null;
  }
}

export async function loadDesktopInstallerOffers(): Promise<DesktopInstallerOffer[]> {
  const apps: DesktopInstallerApp[] = ["astudio", "aconsulting"];
  const manifests = await Promise.all(apps.map((a) => fetchUpdateManifest(a)));
  return apps.map((app, i) => resolveInstallerOffer(app, manifests[i]));
}
