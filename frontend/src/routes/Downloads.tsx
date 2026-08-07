import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { Box, Button, Stack, Typography } from "@mui/material";
import { StatusDot } from "@hcw/ui-kit";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import {
  loadDesktopInstallerOffers,
  type DesktopInstallerOffer,
} from "../lib/desktop-installers.js";
import {
  AORMS_CONSULTANCY,
  AORMS_PLATFORM,
  AORMS_STUDIO,
} from "../lib/product-nomenclature.js";

/**
 * Public `/downloads` portal — local-first desktop installers for AStudio /
 * AConsulting. CTAs stay on web_fallback until a signed URL + sha256 is wired
 * (docs/esti/WEB-PORTAL.md). Legacy Lite/Pro Manager SKUs stay retired.
 */
export function Downloads() {
  const [offers, setOffers] = useState<DesktopInstallerOffer[] | null>(null);

  useEffect(() => {
    document.title = `Downloads · ${AORMS_PLATFORM.name}`;
    let cancelled = false;
    void loadDesktopInstallerOffers().then((rows) => {
      if (!cancelled) setOffers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MarketingShell contours>
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">Desktop · preferred path</p>
          <h1 className="lp2-section-head__title">Downloads</h1>
          <p className="lp2-section-head__body">
            {AORMS_PLATFORM.name} is <strong>desktop preferred with web parity</strong> — the
            same SPA on a local-first node or in the browser. Signed Windows installers
            appear here when packaging ships; until then, open the web workspace.
          </p>
          <p className="lp2-blog-links">
            <Link to="/">Platform home</Link>
            <span aria-hidden> · </span>
            <Link to="/login">{AORMS_STUDIO.title} web</Link>
            <span aria-hidden> · </span>
            <Link to="/blog/aorms-local-first">Local-first notes</Link>
          </p>
        </header>

        <Stack spacing={3} className="lp2-reveal" sx={{ mt: 4, maxWidth: 720 }}>
          {(offers ?? placeholderOffers()).map((offer) => (
            <SoftSurface key={offer.app} sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                  <Typography variant="h5" component="h2">
                    {offer.title}
                  </Typography>
                  <StatusDot
                    color={offer.status === "available" ? "green" : "cool-gray"}
                    label={
                      offer.status === "available"
                        ? offer.version
                          ? `Windows · v${offer.version}`
                          : "Windows · signed"
                        : "Web workspace · installer pending"
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {offer.expansion} — local-first desktop node (Postgres · worker · Ollama on
                  device) with hub sync when licensed. Same Standard licence as web.
                </Typography>

                {offer.status === "available" && offer.downloadUrl ? (
                  <Stack spacing={1.5}>
                    <Box>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<DownloadOutlined />}
                        href={offer.downloadUrl}
                        download
                      >
                        Download {offer.title} for Windows
                      </Button>
                    </Box>
                    {offer.sha256 ? (
                      <Typography variant="caption" color="text.secondary" component="p">
                        SHA-256: <code>{offer.sha256}</code>
                      </Typography>
                    ) : null}
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    <Typography variant="body2">{offer.fallbackReason}</Typography>
                    <Box>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<OpenInNewOutlined />}
                        href={offer.webUrl}
                      >
                        Open {offer.title} in browser
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </SoftSurface>
          ))}

          <Typography variant="body2" color="text.secondary" className="lp2-reveal">
            Legacy Lite / Pro / Community Manager installers and the separate Estimate desktop
            app stay <strong>retired</strong>. Estimating is in-product (Rate Books + project
            Estimation). Operators: wire signed URLs via{" "}
            <code>VITE_ASTUDIO_INSTALLER_URL</code> / <code>VITE_ACONSULTING_INSTALLER_URL</code>{" "}
            or fill <code>frontend/public/update-manifests/*.json</code> and set{" "}
            <code>VITE_PORTAL_USE_RELEASE_INSTALLERS=true</code> — never point live CTAs at
            unsigned overnight builds (wait on Bhoomi for signed URL + sha256).
          </Typography>
        </Stack>
      </div>
    </MarketingShell>
  );
}

function placeholderOffers(): DesktopInstallerOffer[] {
  // Synchronous first paint while manifests fetch — always web_fallback.
  return [
    {
      app: "astudio",
      title: AORMS_STUDIO.title,
      expansion: AORMS_STUDIO.expansion,
      webUrl: AORMS_STUDIO.appUrl,
      downloadUrl: null,
      version: null,
      sha256: null,
      status: "web_fallback",
      fallbackReason:
        "Signed Windows installer not published yet — use the web workspace (same SPA, same Standard licence).",
      manifestPath: "/update-manifests/astudio.json",
    },
    {
      app: "aconsulting",
      title: AORMS_CONSULTANCY.title,
      expansion: AORMS_CONSULTANCY.expansion,
      webUrl: AORMS_CONSULTANCY.appUrl,
      downloadUrl: null,
      version: null,
      sha256: null,
      status: "web_fallback",
      fallbackReason:
        "Signed Windows installer not published yet — use the web workspace (same SPA, same Standard licence).",
      manifestPath: "/update-manifests/aconsulting.json",
    },
  ];
}
