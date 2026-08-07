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
  resolveInstallerOffer,
  type DesktopInstallerApp,
  type DesktopInstallerOffer,
} from "../lib/desktop-installers.js";
import {
  AORMS_PLATFORM,
  AORMS_STUDIO,
  SHILPIDB,
} from "../lib/product-nomenclature.js";

/**
 * Public `/downloads` portal — suite desktop installers (managers + AQC + AADT).
 * CTAs stay on web_fallback until a signed URL + sha256 is wired
 * (docs/esti/WEB-PORTAL.md).
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
          <p className="lp2-section-head__tag">Desktop · suite installers</p>
          <h1 className="lp2-section-head__title">Downloads</h1>
          <p className="lp2-section-head__body">
            {AORMS_PLATFORM.name} is a <strong>product suite</strong> — practice managers
            online for communications; Estimation, BBS, project management, and drafting on
            the desktop. Signed Windows installers appear here when packaging ships; until
            then open the web workspace or the product repo. Drawings stay in{" "}
            {SHILPIDB.name}.
          </p>
          <p className="lp2-blog-links">
            <Link to="/">Suite home</Link>
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
                        : "Installer pending"
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {offer.expansion}
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
                    <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<OpenInNewOutlined />}
                        href={offer.webUrl}
                      >
                        Open {offer.title}
                      </Button>
                      {offer.repoUrl ? (
                        <Button
                          variant="outlined"
                          size="large"
                          endIcon={<OpenInNewOutlined />}
                          href={offer.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          GitHub
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </SoftSurface>
          ))}

          <Typography variant="body2" color="text.secondary" className="lp2-reveal">
            Legacy Lite / Pro / Community Manager installers stay <strong>retired</strong>.
            Operators: wire signed URLs via env or fill{" "}
            <code>frontend/public/update-manifests/*.json</code> and set{" "}
            <code>VITE_PORTAL_USE_RELEASE_INSTALLERS=true</code> — never point live CTAs at
            unsigned overnight builds.
          </Typography>
        </Stack>
      </div>
    </MarketingShell>
  );
}

function placeholderOffers(): DesktopInstallerOffer[] {
  const apps: DesktopInstallerApp[] = [
    "astudio",
    "aconsulting",
    "aqc-estimation",
    "aqc-bbs",
    "aqc-pm",
    "aadt",
  ];
  return apps.map((app) => resolveInstallerOffer(app, null));
}
