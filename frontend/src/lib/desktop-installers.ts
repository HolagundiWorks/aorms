import { isMarketingOnly } from "./marketing-gate.js";

/**
 * Desktop installer resolution for the public `/downloads` portal.
 *
 * Honesty rule: never offer a download button until a **signed** URL is wired.
 * Soft launch (`isMarketingOnly`): force **coming_soon** — no Open / GitHub CTAs.
 * Placeholders stay in `web_fallback` until a signed WinUI installer URL + sha256
 * is published (docs/esti/WEB-PORTAL.md).
 */
import {
  AADT,
  AORMS_CONSULTANCY,
  AORMS_PMC,
  AORMS_STUDIO,
  AQC_BBS,
  AQC_ESTIMATION,
  SHILPIDB,
} from "./product-nomenclature.js";

export type DesktopInstallerApp =
  | "astudio"
  | "aconsulting"
  | "aqc-estimation"
  | "aqc-bbs"
  | "aqc-pm"
  | "aadt";

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
  repoUrl?: string;
  /** Absolute or site-relative URL when a signed installer is live. */
  downloadUrl: string | null;
  version: string | null;
  sha256: string | null;
  status: DesktopInstallerStatus;
  /** Human reason when download is withheld. */
  fallbackReason: string;
  manifestPath: string;
};

const APP_META: Record<
  DesktopInstallerApp,
  { title: string; expansion: string; webUrl: string; repoUrl?: string; manifest: string }
> = {
  astudio: {
    title: AORMS_STUDIO.title,
    expansion: AORMS_STUDIO.expansion,
    webUrl: AORMS_STUDIO.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AStudio",
    manifest: "/update-manifests/astudio.json",
  },
  aconsulting: {
    title: AORMS_CONSULTANCY.title,
    expansion: AORMS_CONSULTANCY.expansion,
    webUrl: AORMS_CONSULTANCY.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AConsulting",
    manifest: "/update-manifests/aconsulting.json",
  },
  "aqc-estimation": {
    title: AQC_ESTIMATION.title,
    expansion: AQC_ESTIMATION.expansion,
    webUrl: AQC_ESTIMATION.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AQC-Estimation",
    manifest: "/update-manifests/aqc-estimation.json",
  },
  "aqc-bbs": {
    title: AQC_BBS.title,
    expansion: AQC_BBS.expansion,
    webUrl: AQC_BBS.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AQC-BBS",
    manifest: "/update-manifests/aqc-bbs.json",
  },
  "aqc-pm": {
    title: AORMS_PMC.suiteTitle ?? AORMS_PMC.title,
    expansion: AORMS_PMC.expansion,
    webUrl: AORMS_PMC.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AQC-PM",
    manifest: "/update-manifests/aqc-pm.json",
  },
  aadt: {
    title: AADT.title,
    expansion: AADT.expansion,
    webUrl: AADT.appUrl,
    repoUrl: "https://github.com/HolagundiWorks/AADT",
    manifest: "/update-manifests/aadt.json",
  },
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
  const map: Partial<Record<DesktopInstallerApp, string | undefined>> = {
    astudio: import.meta.env.VITE_ASTUDIO_INSTALLER_URL as string | undefined,
    aconsulting: import.meta.env.VITE_ACONSULTING_INSTALLER_URL as string | undefined,
  };
  return map[app]?.trim();
}

function releaseInstallersEnabled(): boolean {
  return envFlagTrue(
    import.meta.env.VITE_PORTAL_USE_RELEASE_INSTALLERS as string | undefined,
  );
}

export function resolveInstallerOffer(
  app: DesktopInstallerApp,
  manifest?: DesktopUpdateManifest | null,
): DesktopInstallerOffer {
  const meta = APP_META[app];

  // Soft launch: installers are announced as Coming soon only.
  if (isMarketingOnly()) {
    return {
      app,
      title: meta.title,
      expansion: meta.expansion,
      webUrl: meta.webUrl,
      repoUrl: meta.repoUrl,
      downloadUrl: null,
      version: null,
      sha256: null,
      status: "coming_soon",
      fallbackReason:
        "Windows installer coming soon — follow the blog for release notes.",
      manifestPath: meta.manifest,
    };
  }

  const envUrl = envInstallerUrl(app);
  const manifestUrl = (manifest?.url ?? "").trim();
  const sha = (manifest?.sha256 ?? "").trim() || null;
  const version = (manifest?.version ?? "").trim() || null;
  const manifestStatus = (manifest?.status ?? "web_fallback") as DesktopInstallerStatus;

  if (envUrl && looksLikeHttpsOrSitePath(envUrl)) {
    return {
      app,
      title: meta.title,
      expansion: meta.expansion,
      webUrl: meta.webUrl,
      repoUrl: meta.repoUrl,
      downloadUrl: envUrl,
      version,
      sha256: sha,
      status: "available",
      fallbackReason: "",
      manifestPath: meta.manifest,
    };
  }

  if (
    releaseInstallersEnabled() &&
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
      repoUrl: meta.repoUrl,
      downloadUrl: manifestUrl,
      version,
      sha256: sha,
      status: "available",
      fallbackReason: "",
      manifestPath: meta.manifest,
    };
  }

  return {
    app,
    title: meta.title,
    expansion: meta.expansion,
    webUrl: meta.webUrl,
    repoUrl: meta.repoUrl,
    downloadUrl: null,
    version,
    sha256: sha,
    status: "web_fallback",
    fallbackReason:
      app === "aadt"
        ? `Build from source — ${SHILPIDB.name} geometry store pairs with drafting.`
        : "Signed Windows installer not published yet — open the repo or demo workspace.",
    manifestPath: meta.manifest,
  };
}

export async function fetchUpdateManifest(
  app: DesktopInstallerApp,
): Promise<DesktopUpdateManifest | null> {
  try {
    const res = await fetch(APP_META[app].manifest, { credentials: "omit" });
    if (!res.ok) return null;
    return (await res.json()) as DesktopUpdateManifest;
  } catch {
    return null;
  }
}

export async function loadDesktopInstallerOffers(): Promise<DesktopInstallerOffer[]> {
  const apps: DesktopInstallerApp[] = [
    "astudio",
    "aconsulting",
    "aqc-estimation",
    "aqc-bbs",
    "aqc-pm",
    "aadt",
  ];
  const manifests = await Promise.all(apps.map((a) => fetchUpdateManifest(a)));
  return apps.map((app, i) => resolveInstallerOffer(app, manifests[i]));
}
