import { Box, Button, Stack, Typography } from "@mui/material";
import { StatusDot } from "@hcw/ui-kit";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import {
  installersComingSoonForced,
  loadDesktopInstallerOffers,
  resolveInstallerOffer,
  type DesktopInstallerApp,
  type DesktopInstallerOffer,
} from "../lib/desktop-installers.js";
import {
  AORMS_PLATFORM,
  SHILPIDB,
} from "../lib/product-nomenclature.js";

/**
 * Public `/downloads` portal — suite desktop installers.
 * Coming soon until D6 (signed URL + release flag) — independent of auth soft launch.
 */
export function Downloads() {
  const [offers, setOffers] = useState<DesktopInstallerOffer[] | null>(null);
  const softLaunch = installersComingSoonForced();

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
            {softLaunch ? (
              <>
                Windows installers for the {AORMS_PLATFORM.name} suite are{" "}
                <strong>coming soon</strong>. This site is live for the suite home and
                blog; signed builds will appear here when packaging ships. Drawings stay
                in {SHILPIDB.name}.
              </>
            ) : (
              <>
                {AORMS_PLATFORM.name} is a <strong>product suite</strong> — practice managers
                for communications; Estimation, BBS, project management, and drafting on the
                desktop. Until a signed Windows build is published, open the product page or
                GitHub repo. Drawings stay in {SHILPIDB.name}.
              </>
            )}
          </p>
          <p className="lp2-blog-links">
            <Link to="/">Suite home</Link>
            <span aria-hidden> · </span>
            <Link to="/blog">Blog</Link>
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
                        : offer.status === "coming_soon"
                          ? "Coming soon"
                          : "Installer pending"
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {offer.expansion}
                </Typography>

                {offer.status === "available" && offer.downloadUrl ? (
                  <Box>
                    <Button variant="contained" size="large" href={offer.downloadUrl} download>
                      Download {offer.title} for Windows
                    </Button>
                  </Box>
                ) : offer.status === "coming_soon" ? (
                  <Stack spacing={1}>
                    <Typography variant="body2">{offer.fallbackReason}</Typography>
                    <Box>
                      <Button variant="outlined" size="large" disabled>
                        Coming soon
                      </Button>
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2">{offer.fallbackReason}</Typography>
                )}
              </Stack>
            </SoftSurface>
          ))}

          <Typography variant="body2" color="text.secondary" className="lp2-reveal">
            {softLaunch
              ? "Release notes will land on the blog when signed installers are ready."
              : "Legacy Lite / Pro / Community Manager installers stay retired."}
          </Typography>
        </Stack>
      </div>
    </MarketingShell>
  );
}

function placeholderOffers(): DesktopInstallerOffer[] {
  const apps: DesktopInstallerApp[] = [
    "aorms-connect",
    "astudio",
    "aconsulting",
    "aqc-estimation",
    "aqc-bbs",
    "aqc-pm",
    "aadt",
  ];
  return apps.map((app) => resolveInstallerOffer(app, null));
}
