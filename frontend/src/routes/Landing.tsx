import { useEffect } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForwardOutlined";
import ExpandMore from "@mui/icons-material/ExpandMoreOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import HubOutlined from "@mui/icons-material/HubOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import DnsOutlined from "@mui/icons-material/DnsOutlined";
import SelfImprovementOutlined from "@mui/icons-material/SelfImprovementOutlined";
import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import EngineeringOutlined from "@mui/icons-material/EngineeringOutlined";
import {
  KpiStrip,
  Surface,
  RADIUS,
} from "@hcw/ui-kit";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { MarketingLandingDock } from "../components/landing/MarketingLandingDock.js";
import { LandingWellbeingWidget } from "../components/landing/LandingWellbeingWidget.js";
import { LandingEntourage } from "../components/landing/LandingEntourage.js";
import { LandingEcosystemMap } from "../components/landing/LandingEcosystemMap.js";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  PLATFORM_FRAMEWORKS,
  SUITE_CORE_APPS,
  SUITE_MANAGER_APPS,
  SUITE_TECHNICAL_APPS,
  SHILPIDB,
  AORMS_STUDIO,
  AORMS_CONSULTANCY,
  AADT,
  EOMS,
  ESTI,
  HUMAN_CENTRIC_WORKS,
} from "../lib/product-nomenclature.js";
import { applyLandingSeo, getLandingFaq, injectLandingJsonLd } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";
import { isMarketingOnly } from "../lib/marketing-gate.js";
import { installersComingSoonForced } from "../lib/desktop-installers.js";
import { MARKETING_CONTENT_GUTTER, MARKETING_RHYTHM, marketingContentColumnSx } from "../lib/marketing-layout.js";

/**
 * AEC landing IA (odd dock peers):
 * Overview → Outcomes → Audience → Platform → Start
 * Rhythm wellbeing folds into Start. Composition: COMPOSITION-PRINCIPLES.md
 */
const SECTIONS = [
  { href: "#top", label: "Overview" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#audience", label: "Audience" },
  { href: "#platform", label: "Platform" },
  { href: "#start", label: "Start" },
] as const;

/** Market outcomes — five peers (list bands, not card collage). */
const OUTCOMES = [
  {
    icon: <PaymentsOutlined fontSize="small" />,
    title: "Recover fees you already earned",
    body: "Revisions, proposals, and invoices stay on one project record. Scope changes bill correctly — margin stops leaking into uninvoiced nights.",
  },
  {
    icon: <HubOutlined fontSize="small" />,
    title: "One suite — not five disconnected tools",
    body: "Managers for the office, AQC for quantities and programme, AADT for drafting, ShilpiDB for drawings. Firm portals publish updates — no spreadsheet archaeology.",
  },
  {
    icon: <DnsOutlined fontSize="small" />,
    title: "Technical work stays local",
    body: "Estimation, BBS, project management, and drafting run on the desktop. aorms.in is marketing and blog — not staff ERP in the browser.",
  },
  {
    icon: <VerifiedUserOutlined fontSize="small" />,
    title: "AI that cites your firm — not the open web",
    body: `${ESTI.name} answers from validated firm repositories on the desktop. ${EOMS.name} supplies external codes. Nothing trains a third-party model.`,
  },
  {
    icon: <SelfImprovementOutlined fontSize="small" />,
    title: "See the office before it slips",
    body: `Practice managers surface fee risk, delivery health, and ${ESTI.name} priorities so principals act before the week collapses.`,
  },
] as const;

const AUDIENCE = [
  {
    id: "architecture",
    icon: <ArchitectureOutlined fontSize="small" />,
    title: "Architecture studios",
    product: AORMS_STUDIO.title,
    body: "Fee recovery, client portals, office papers, and studio rhythm — practice communications without owning CAD or BOQ math.",
  },
  {
    id: "engineering",
    icon: <EngineeringOutlined fontSize="small" />,
    title: "Engineering consultancies",
    product: AORMS_CONSULTANCY.title,
    body: "Engagements, deliverables, technical queries, and coordination — the engineering office runs on one record while calc stays local.",
  },
] as const;

/** Proof stats — three peers (odd · Cowan-friendly). */
const STATS = [
  { id: "apps", label: "Suite product families", value: "6+" },
  { id: "ai", label: "AI tiers · EOMS + ESTI", value: "Dual" },
  { id: "oss", label: "Licensing right now", value: "OSS" },
] as const;

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <Stack
      className="esti-lp-reveal"
      spacing={MARKETING_RHYTHM.sm}
      sx={{ mb: MARKETING_RHYTHM.headMb, maxWidth: 720 }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: "0.14em", fontFamily: "inherit" }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        {title}
      </Typography>
      {lead ? (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620, lineHeight: 1.55 }}>
          {lead}
        </Typography>
      ) : null}
    </Stack>
  );
}

function Bar({ w = "100%" }: { w?: number | string }) {
  return (
    <Box
      sx={{
        height: 8,
        width: w,
        borderRadius: 1,
        bgcolor: (t) => t.palette.action.hover,
      }}
    />
  );
}

/** Practice desk proof — Platform only; never in the hero. */
function WorkspacePreview() {
  return (
    <SoftSurface
      aria-hidden
      className="esti-lp-reveal"
      sx={{
        p: { xs: MARKETING_RHYTHM.md, md: MARKETING_RHYTHM.lg },
        height: { xs: 240, md: "min(40vh, 320px)" },
        minHeight: { md: 280 },
      }}
    >
      <Stack spacing={MARKETING_RHYTHM.md} sx={{ height: "100%" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Bar w={72} />
          <Box sx={{ flex: 1 }} />
          <Bar w={40} />
          <Bar w={40} />
        </Stack>
        <KpiStrip
          items={[
            { id: "a", label: "Fee at risk", value: "₹2.4L" },
            { id: "b", label: "Open loops", value: "3" },
            { id: "c", label: "Health", value: "Steady" },
          ]}
        />
        <Surface
          layer="flat"
          sx={{
            flex: 1,
            minHeight: 0,
            p: MARKETING_RHYTHM.md,
            border: (t) => `1px solid ${t.palette.divider}`,
            display: "flex",
            flexDirection: "column",
            gap: MARKETING_RHYTHM.sm,
          }}
        >
          <Bar w="40%" />
          <Bar w="92%" />
          <Bar w="78%" />
          <Bar w="60%" />
        </Surface>
      </Stack>
    </SoftSurface>
  );
}

function useLandingReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".esti-lp-reveal"));
    if (nodes.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((el) => el.classList.add("esti-lp-reveal--in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).classList.add("esti-lp-reveal--in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Single-page AORMS suite landing — AEC architecture + engineering focus. */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const { hash } = useLocation();
  useLandingReveal();

  useEffect(() => {
    applyLandingSeo();
    injectLandingJsonLd();
  }, []);

  useEffect(() => {
    const section = hash.replace(/^#/, "");
    if (!section) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <MarketingNeuFrame>
      <Box className="esti-lp-aec-home" sx={{ position: "relative", width: "100%" }}>
        <LandingEntourage count={15} seed={77} />

        {/* 1 — Overview: brand + one big-picture ecosystem view */}
        <Box id="top" component="section" className="esti-lp-hero-bleed esti-lp-hero-bleed--eco">
          <div className="esti-lp-hero-bleed__grade" aria-hidden />
          <Container
            maxWidth={false}
            disableGutters
            className="esti-lp-hero-bleed__inner"
            sx={{
              ...marketingContentColumnSx,
              position: "relative",
              zIndex: 1,
              px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
            }}
          >
            <Box className="esti-lp-neu-hero esti-lp-hero-bleed__copy">
              <Box className="esti-lp-hero-in esti-lp-hero-in--1">
                <AormsLogo variant="hero" />
              </Box>
              <Typography
                className="esti-lp-hero-in esti-lp-hero-in--2"
                variant="overline"
                color="text.secondary"
                sx={{ mt: MARKETING_RHYTHM.sm, letterSpacing: "0.1em", display: "block" }}
              >
                {AORMS_PLATFORM.expansion}
              </Typography>
              <Typography
                className="esti-lp-hero-in esti-lp-hero-in--3"
                variant="h3"
                component="h1"
                sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 700, lineHeight: 1.15, maxWidth: 720 }}
              >
                {AORMS_PLATFORM.heroHeadline[0]}
              </Typography>
              <Typography
                className="esti-lp-hero-in esti-lp-hero-in--4"
                variant="body1"
                color="text.secondary"
                sx={{ mt: MARKETING_RHYTHM.sm, mb: MARKETING_RHYTHM.md, maxWidth: 560, lineHeight: 1.55 }}
              >
                {AORMS_PLATFORM.heroSupport}
              </Typography>
              <Stack
                className="esti-lp-hero-in esti-lp-hero-in--5"
                direction="row"
                spacing={MARKETING_RHYTHM.sm}
                sx={{ flexWrap: "wrap", gap: MARKETING_RHYTHM.sm, mb: MARKETING_RHYTHM.lg }}
              >
                {isMarketingOnly() ? (
                  <Button
                    component={RouterLink}
                    to="/downloads"
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForward />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px`, minHeight: 48, px: 3 }}
                  >
                    Downloads — coming soon
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to="/login?tab=portals"
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForward />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px`, minHeight: 48, px: 3 }}
                  >
                    Firm portal demos
                  </Button>
                )}
                <Button
                  component="a"
                  href="#platform"
                  variant="outlined"
                  color="inherit"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Suite detail
                </Button>
                <Button
                  component={RouterLink}
                  to="/blog"
                  variant="outlined"
                  color="inherit"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Blog
                </Button>
                {!isMarketingOnly() && (
                  <Button
                    component={RouterLink}
                    to="/downloads"
                    variant="text"
                    color="inherit"
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                  >
                    {installersComingSoonForced() ? "Downloads — coming soon" : "Downloads"}
                  </Button>
                )}
              </Stack>
            </Box>

            <Box className="esti-lp-hero-in esti-lp-hero-in--6 esti-lp-hero-bleed__eco">
              <LandingEcosystemMap />
            </Box>
          </Container>
        </Box>

        <Container
          maxWidth={false}
          disableGutters
          sx={{
            ...marketingContentColumnSx,
            position: "relative",
            zIndex: 1,
            px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
            pb: 14,
          }}
        >
          {/* 2 — Outcomes: list bands */}
          <Box id="outcomes" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SectionHead
              eyebrow="Outcomes"
              title="What changes when the practice runs on one record"
              lead="Not another dashboard — fee recovery, delivery quality, and trusted answers stop competing with tool chaos."
            />
            <Stack className="esti-lp-outcome-list" spacing={0} divider={<Divider />}>
              {OUTCOMES.map((o) => (
                <Stack
                  key={o.title}
                  className="esti-lp-reveal esti-lp-outcome-row"
                  direction="row"
                  spacing={MARKETING_RHYTHM.md}
                  sx={{ alignItems: "flex-start", py: MARKETING_RHYTHM.md }}
                >
                  <Box sx={{ color: "text.secondary", display: "flex", mt: 0.35 }} aria-hidden>
                    {o.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {o.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 640 }}>
                      {o.body}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* 3 — Audience: architecture + engineering peers */}
          <Box id="audience" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SectionHead
              eyebrow="Audience"
              title="Built for the practices that design and advise"
              lead="Two practice managers. Same suite spine. PMC governance lives with AProc under Platform."
            />
            <Grid container spacing={MARKETING_RHYTHM.lg}>
              {AUDIENCE.map((a) => (
                <Grid key={a.id} size={{ xs: 12, md: 6 }}>
                  <Stack className="esti-lp-reveal esti-lp-audience-peer" spacing={MARKETING_RHYTHM.sm}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Box sx={{ color: "primary.main", display: "flex" }} aria-hidden>
                        {a.icon}
                      </Box>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em" }}>
                        {a.product}
                      </Typography>
                    </Stack>
                    <Typography variant="h5" component="h3" sx={{ fontWeight: 700 }}>
                      {a.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.55, maxWidth: 420 }}>
                      {a.body}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* 4 — Platform: managers first, then technical */}
          <Box id="platform" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SoftSurface className="esti-lp-reveal" sx={{ p: { xs: MARKETING_RHYTHM.md, md: MARKETING_RHYTHM.lg }, mb: MARKETING_RHYTHM.blockGap }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em" }}>
                Replaces the sprawl
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: MARKETING_RHYTHM.sm, mt: MARKETING_RHYTHM.sm }}>
                {AORMS_PLATFORM.fragmentedTools.map((tool) => (
                  <Typography
                    key={tool}
                    variant="body2"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      color: "text.secondary",
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: `${RADIUS}px`,
                    }}
                  >
                    {tool}
                  </Typography>
                ))}
                <Typography
                  variant="body2"
                  sx={{ px: 1.5, py: 0.5, fontWeight: 700, color: "primary.main" }}
                >
                  → {AORMS_PLATFORM.name}
                </Typography>
              </Stack>
            </SoftSurface>

            <SectionHead
              eyebrow="Suite"
              title="Managers first. Technical apps local. Drafting shared."
              lead="AORMS Connect is the suite core — sign in once and launch every app. Practice managers sync communications to firm portals. Estimation, BBS, and project management run locally on a shared engine."
            />

            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em", display: "block", mb: MARKETING_RHYTHM.sm }}>
              Practice managers
            </Typography>
            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              {SUITE_MANAGER_APPS.map((app) => (
                <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                  <Stack
                    className="esti-lp-reveal"
                    id={app.id}
                    spacing={MARKETING_RHYTHM.sm}
                    sx={{ py: MARKETING_RHYTHM.sm, borderTop: (t) => `1px solid ${t.palette.divider}` }}
                  >
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {app.workspace}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {app.subtitle} · Coming soon
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {app.body}
                    </Typography>
                    <Box>
                      <Button
                        component={RouterLink}
                        to="/downloads"
                        variant="text"
                        color="inherit"
                        size="small"
                        endIcon={<ArrowForward />}
                        sx={{ textTransform: "none", fontWeight: 700, px: 0, minHeight: 44 }}
                      >
                        {app.cta}
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={MARKETING_RHYTHM.lg} sx={{ mb: MARKETING_RHYTHM.blockGap, alignItems: "center" }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em" }}>
                  Practice desk
                </Typography>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: MARKETING_RHYTHM.sm }}>
                  Priorities the principal can act on
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 420 }}>
                  Fee risk, open loops, and office health — the manager view for architecture and engineering firms.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <WorkspacePreview />
              </Grid>
            </Grid>

            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              {Object.values(PLATFORM_FRAMEWORKS).map((fw) => (
                <Grid key={fw.title} size={{ xs: 12, md: 6 }}>
                  <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm} sx={{ py: MARKETING_RHYTHM.sm }}>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                      {fw.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fw.summary}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em", display: "block", mb: MARKETING_RHYTHM.sm }}>
              Suite core
            </Typography>
            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              {SUITE_CORE_APPS.map((app) => (
                <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                  <Stack
                    className="esti-lp-reveal"
                    id={app.id}
                    spacing={MARKETING_RHYTHM.sm}
                    sx={{ py: MARKETING_RHYTHM.sm, borderTop: (t) => `1px solid ${t.palette.divider}` }}
                  >
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {app.workspace}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {app.subtitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {app.body}
                    </Typography>
                    <Box>
                      <Button
                        component={RouterLink}
                        to="/downloads"
                        variant="text"
                        color="inherit"
                        size="small"
                        endIcon={<ArrowForward />}
                        sx={{ textTransform: "none", fontWeight: 700, px: 0, minHeight: 44 }}
                      >
                        {app.cta}
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em", display: "block", mb: MARKETING_RHYTHM.sm }}>
              Technical &amp; drafting
            </Typography>
            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              {SUITE_TECHNICAL_APPS.map((app) => (
                <Grid key={app.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack
                    className="esti-lp-reveal"
                    id={app.id}
                    spacing={MARKETING_RHYTHM.sm}
                    sx={{ py: MARKETING_RHYTHM.sm, height: "100%" }}
                  >
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {app.workspace}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {app.subtitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {app.body}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                      <Button
                        component="a"
                        href={app.href}
                        target={app.href.startsWith("http") ? "_blank" : undefined}
                        rel={app.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        variant="text"
                        color="inherit"
                        size="small"
                        sx={{ textTransform: "none", fontWeight: 700, px: 0, minHeight: 44 }}
                      >
                        {app.cta}
                      </Button>
                      <Button
                        component="a"
                        href={app.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="text"
                        size="small"
                        sx={{ textTransform: "none", fontWeight: 600, minHeight: 44 }}
                      >
                        Repo
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm} sx={{ mb: MARKETING_RHYTHM.blockGap, py: MARKETING_RHYTHM.md, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                {SHILPIDB.name}
              </Typography>
              <Typography variant="overline" color="text.secondary">
                {SHILPIDB.role}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
                {SHILPIDB.summary}
              </Typography>
              <Box>
                <Button
                  component="a"
                  href={SHILPIDB.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ textTransform: "none", fontWeight: 700, px: 0, minHeight: 44 }}
                >
                  ShilpiDB on GitHub
                </Button>
              </Box>
            </Stack>

            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              {[EOMS, ESTI].map((tier) => (
                <Grid key={tier.name} size={{ xs: 12, md: 6 }}>
                  <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm} sx={{ py: MARKETING_RHYTHM.sm }}>
                    <Stack direction="row" spacing={MARKETING_RHYTHM.sm} sx={{ alignItems: "baseline" }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 800 }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="overline" color="text.secondary">
                        {tier.role}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {tier.summary}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <SoftSurface className="esti-lp-reveal" sx={{ p: { xs: MARKETING_RHYTHM.cardPad, md: MARKETING_RHYTHM.lg } }}>
              <KpiStrip
                aria-label="AORMS platform at a glance"
                items={STATS.map((s) => ({
                  id: s.id,
                  label: s.label,
                  value: (
                    <Box component="span" sx={{ fontSize: "1.9rem", fontWeight: 800, color: "text.primary" }}>
                      {s.value}
                    </Box>
                  ),
                }))}
              />
              {visitCount != null ? (
                <Typography variant="caption" color="text.disabled" sx={{ mt: MARKETING_RHYTHM.md, display: "block" }}>
                  {visitCount.toLocaleString()} visits to this page and counting.
                </Typography>
              ) : null}
            </SoftSurface>
          </Box>

          {/* 5 — Start: rhythm + convert + FAQ */}
          <Box id="start" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SectionHead
              eyebrow="Rhythm"
              title="Delivery quality needs recovery — built in, not bolted on"
              lead="Deadline pressure is the job. Focus and wellbeing stay inside the chrome so sharp judgment survives long drawing nights — opt-in, never surveillance."
            />
            <Stack className="esti-lp-reveal" spacing={0} divider={<Divider />} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
              <Box sx={{ py: MARKETING_RHYTHM.md }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  Calm between critical sets
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 640 }}>
                  Guided breathe, desk stretches, and eye breaks reset attention before the next revision lands — without leaving the workspace.
                </Typography>
              </Box>
              <Box sx={{ py: MARKETING_RHYTHM.md }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  One Pomodoro on the clock
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 640 }}>
                  Click the orange-ringed analogue clock to start or pause. Drag the crown in 5-minute steps. Double-click to reset.
                </Typography>
              </Box>
              <Box sx={{ py: MARKETING_RHYTHM.md }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  Opt-in, never a scoreboard
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 640 }}>
                  ASPRF wellbeing is only 5% of the composite and each person opts themselves in. Coaching signal — not discipline.
                </Typography>
              </Box>
            </Stack>
            <Box className="esti-lp-reveal" sx={{ mb: MARKETING_RHYTHM.sectionY }}>
              <LandingWellbeingWidget />
            </Box>

            <SectionHead
              eyebrow="Start"
              title="Open source for now. Desktop preferred."
              lead="Soft launch: suite home and blog are live. Windows installers and workspace sign-in are coming soon — start with why the suite exists."
            />
            <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.lg }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm}>
                  <Typography variant="overline" color="text.secondary">
                    Managers
                  </Typography>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                    {AORMS_STUDIO.title} · {AORMS_CONSULTANCY.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasks, office, HR, and portal communications for architecture studios and engineering consultancies.
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm}>
                  <Typography variant="overline" color="text.secondary">
                    Technical
                  </Typography>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                    AQC · {AADT.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimation, BBS, and project management on a shared engine; drafting in AADT with geometry in{" "}
                    {SHILPIDB.name}.
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack className="esti-lp-reveal" spacing={MARKETING_RHYTHM.sm}>
                  <Typography variant="overline" color="text.secondary">
                    Online
                  </Typography>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                    Firm portals
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Clients and collaborators see published updates only. This apex site stays marketing and product news.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>

            <SoftSurface
              className="esti-lp-reveal"
              sx={{ p: { xs: MARKETING_RHYTHM.lg, md: MARKETING_RHYTHM.xl }, textAlign: "center", mb: MARKETING_RHYTHM.xl }}
            >
              <Typography variant="h4" component="h3" sx={{ fontWeight: 800 }}>
                Bring the practice onto one suite.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.md, maxWidth: 520, mx: "auto" }}>
                Architecture studios and engineering consultancies — explore offers and repos while installers are Coming soon.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={MARKETING_RHYTHM.md}
                sx={{ justifyContent: "center", mt: MARKETING_RHYTHM.lg }}
              >
                <Button
                  component={RouterLink}
                  to="/downloads"
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Downloads — coming soon
                </Button>
                <Button
                  component={RouterLink}
                  to="/blog"
                  variant="outlined"
                  color="inherit"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Read the blog
                </Button>
                <Button
                  component="a"
                  href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}
                  variant="text"
                  color="inherit"
                  size="large"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Talk to HCW
                </Button>
              </Stack>
            </SoftSurface>

            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: "0.12em", display: "block", mb: MARKETING_RHYTHM.md }}
            >
              Questions practices ask first
            </Typography>
            <Box className="esti-lp-reveal" sx={{ maxWidth: 820 }}>
              {getLandingFaq().map((item) => (
                <Accordion
                  key={item.question}
                  disableGutters
                  elevation={0}
                  square
                  sx={{
                    bgcolor: "transparent",
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{ px: 0, py: 1, "& .MuiAccordionSummary-content": { my: 1.5 } }}
                  >
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {item.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                      {item.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>

          <Box component="footer" sx={{ pt: 6, mt: 4, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                  <AormsLogo variant="sm" />
                  <Typography variant="caption" color="text.secondary">
                    {AORMS_PLATFORM.expansion}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                  {AORMS_PLATFORM.tagline}. {HUMAN_CENTRIC_WORKS.attribution}.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  On this page
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  {SECTIONS.map((s) => (
                    <Box key={s.href} component="a" href={s.href} sx={{ color: "text.secondary", textDecoration: "none" }}>
                      <Typography variant="body2">{s.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  Company
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Box component={RouterLink} to="/blog" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Blog</Typography>
                  </Box>
                  <Box
                    component={RouterLink}
                    to="/downloads"
                    sx={{ color: "text.secondary", textDecoration: "none" }}
                  >
                    <Typography variant="body2">Downloads (coming soon)</Typography>
                  </Box>
                  <Box
                    component="a"
                    href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}
                    sx={{ color: "text.secondary", textDecoration: "none" }}
                  >
                    <Typography variant="body2">{HUMAN_CENTRIC_WORKS.email}</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: "block" }}>
              {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location} ·{" "}
              <Box component="a" href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} sx={{ color: "inherit" }}>
                {HUMAN_CENTRIC_WORKS.email}
              </Box>
            </Typography>
          </Box>
        </Container>

        <MarketingLandingDock
          sections={SECTIONS}
          signInHref={isMarketingOnly() ? "/" : "/login?tab=portals"}
          signInLabel={isMarketingOnly() ? "Home" : "Sign in"}
        />
      </Box>
    </MarketingNeuFrame>
  );
}
