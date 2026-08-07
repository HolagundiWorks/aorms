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
import {
  KpiStrip,
  StatusDot,
  Surface,
  RADIUS,
} from "@hcw/ui-kit";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { MarketingLandingDock } from "../components/landing/MarketingLandingDock.js";
import { LandingWellbeingWidget } from "../components/landing/LandingWellbeingWidget.js";
import { LandingEntourage } from "../components/landing/LandingEntourage.js";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  PLATFORM_FRAMEWORKS,
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
import { applyLandingSeo, injectLandingJsonLd, LANDING_FAQ } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";
import { MARKETING_CONTENT_GUTTER, MARKETING_RHYTHM, marketingContentColumnSx } from "../lib/marketing-layout.js";

/**
 * Five-section IA — hierarchy by market impact (odd count):
 * 1 Overview → attention · 2 Outcomes → why buy · 3 Platform → proof ·
 * 4 Rhythm → differentiation · 5 Start → convert.
 * Composition: docs/esti/COMPOSITION-PRINCIPLES.md
 */
const SECTIONS = [
  { href: "#top", label: "Overview" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#platform", label: "Platform" },
  { href: "#rhythm", label: "Rhythm" },
  { href: "#start", label: "Start" },
] as const;

/** Market outcomes — five peers (odd grouping). */
const OUTCOMES = [
  {
    icon: <PaymentsOutlined fontSize="small" />,
    title: "Recover fees you already earned",
    body: "Practice managers keep revisions, proposals, and invoices on one project record. Scope changes bill correctly — margin stops leaking into uninvoiced nights.",
  },
  {
    icon: <HubOutlined fontSize="small" />,
    title: "One suite — not five disconnected tools",
    body: "Managers for communications, AQC apps for quantities and programme, AADT for drafting, ShilpiDB for drawings. Firm portals publish updates — no spreadsheet archaeology.",
  },
  {
    icon: <VerifiedUserOutlined fontSize="small" />,
    title: "AI that cites your firm — not the open web",
    body: `${ESTI.name} answers only from validated firm repositories on the desktop. ${EOMS.name} supplies external codes. Nothing trains a third-party model.`,
  },
  {
    icon: <DnsOutlined fontSize="small" />,
    title: "Technical work stays local",
    body: "Estimation, BBS, project management, and drafting run on the desktop. Firm portals and this marketing site stay online — aorms.in is demos and downloads, not staff ERP.",
  },
  {
    icon: <SelfImprovementOutlined fontSize="small" />,
    title: "See the office before it slips",
    body: `Practice managers surface fee risk, delivery health, and ${ESTI.name} priorities so principals act before the week collapses.`,
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
    <Stack spacing={MARKETING_RHYTHM.sm} sx={{ mb: MARKETING_RHYTHM.headMb, maxWidth: 720 }}>
      <Typography
        variant="overline"
        color="primary"
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

function WorkspacePreview() {
  return (
    <SoftSurface
      aria-hidden
      sx={{
        p: { xs: MARKETING_RHYTHM.md, md: MARKETING_RHYTHM.lg },
        height: { xs: 280, md: "min(52vh, 420px)" },
        minHeight: { md: 360 },
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
          <Bar w="85%" />
          <Bar w="60%" />
        </Surface>
      </Stack>
    </SoftSurface>
  );
}

/** Single-page AORMS platform landing — five graded sections. */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const { hash } = useLocation();

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
      <Box sx={{ position: "relative", width: "100%" }}>
        <LandingEntourage count={15} seed={77} />
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
        {/* 1 — Overview: brand copy + Studio Intelligence preview */}
        <Box
          id="top"
          component="section"
          sx={{
            pt: MARKETING_RHYTHM.sectionY,
            pb: MARKETING_RHYTHM.sectionY,
          }}
        >
          <Grid
            container
            spacing={MARKETING_RHYTHM.lg}
            sx={{
              alignItems: "center",
              mb: MARKETING_RHYTHM.lg,
              minHeight: { md: "min(52vh, 420px)" },
            }}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Box className="esti-lp-neu-hero">
                <AormsLogo variant="hero" />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ mt: MARKETING_RHYTHM.md, letterSpacing: "0.1em", display: "block" }}
                >
                  {AORMS_PLATFORM.expansion}
                </Typography>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 700, lineHeight: 1.2, maxWidth: 560 }}
                >
                  {AORMS_PLATFORM.heroHeadline[0]}
                </Typography>
                <Typography
                  variant="h5"
                  component="p"
                  color="text.secondary"
                  sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 500, lineHeight: 1.35, maxWidth: 520 }}
                >
                  {AORMS_PLATFORM.heroHeadline[1]}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: MARKETING_RHYTHM.md, mb: MARKETING_RHYTHM.lg, maxWidth: 520, lineHeight: 1.55 }}
                >
                  {AORMS_PLATFORM.tagline}. Desktop apps for practice work — firm portals for
                  clients. Marketing and demos live here.
                </Typography>
                {/* Soft launch: downloads coming soon; no demo login */}
                <Stack direction="row" spacing={MARKETING_RHYTHM.sm} sx={{ flexWrap: "wrap", gap: MARKETING_RHYTHM.sm }}>
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
                  <Button
                    component="a"
                    href="#platform"
                    variant="outlined"
                    color="inherit"
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                  >
                    Suite map
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/blog"
                    variant="text"
                    color="inherit"
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                  >
                    Blog
                  </Button>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mt: MARKETING_RHYTHM.lg }}
                >
                  <StatusDot color="green" label="" size="sm" />
                  <Typography variant="caption" color="text.secondary">
                    Suite: managers · AQC Estimation/BBS/PM · AADT · ShilpiDB · firm portals
                  </Typography>
                </Stack>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <WorkspacePreview />
            </Grid>
          </Grid>

          <SoftSurface sx={{ p: { xs: MARKETING_RHYTHM.md, md: MARKETING_RHYTHM.lg }, mt: 0 }}>
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
        </Box>

        {/* 2 — Outcomes: five cards (odd grouping) */}
        <Box id="outcomes" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
          <SectionHead
            eyebrow="Outcomes"
            title="What changes when the practice runs on one record"
            lead="AORMS is not another dashboard. It is how fee recovery, delivery quality, and trusted answers stop competing with tool chaos."
          />
          <Grid container spacing={MARKETING_RHYTHM.md}>
            {OUTCOMES.map((o) => (
              <Grid key={o.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Surface
                  layer="flat"
                  sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}
                >
                  <Stack direction="row" spacing={MARKETING_RHYTHM.sm} sx={{ alignItems: "flex-start" }}>
                    <Box sx={{ color: "text.secondary", display: "flex", mt: 0.25 }}>{o.icon}</Box>
                    <Box>
                      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                        {o.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                        {o.body}
                      </Typography>
                    </Box>
                  </Stack>
                </Surface>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 3 — Platform: frameworks, apps, AI, proof figures */}
        <Box id="platform" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
          <SectionHead
            eyebrow="Suite"
            title="Managers. Technical apps. Drafting. Shared drawings."
            lead="Practice managers sync communications to firm portals. Estimation, BBS, and project management run locally on a shared engine. AADT drafts into ShilpiDB."
          />
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
            {Object.values(PLATFORM_FRAMEWORKS).map((fw) => (
              <Grid key={fw.title} size={{ xs: 12, md: 6 }}>
                <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%" }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                    {fw.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                    {fw.summary}
                  </Typography>
                </SoftSurface>
              </Grid>
            ))}
          </Grid>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em", display: "block", mb: MARKETING_RHYTHM.sm }}>
            Practice managers
          </Typography>
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
            {SUITE_MANAGER_APPS.map((app) => (
              <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                <Surface layer="flat" id={app.id} sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                      {app.workspace}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.25,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: app.status === "live" ? "text.primary" : "text.disabled",
                        border: (t) => `1px solid ${t.palette.divider}`,
                      }}
                    >
                      {app.status === "live" ? "Live" : app.status === "preview" ? "Preview" : "Roadmap"}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {app.subtitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                    {app.body}
                  </Typography>
                  <Button
                    component="a"
                    href={app.href}
                    variant={app.id === "studio" ? "contained" : "outlined"}
                    color={app.id === "studio" ? "primary" : "inherit"}
                    size="small"
                    endIcon={<ArrowForward />}
                    sx={{ mt: MARKETING_RHYTHM.md, textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px` }}
                  >
                    {app.cta}
                  </Button>
                </Surface>
              </Grid>
            ))}
          </Grid>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.1em", display: "block", mb: MARKETING_RHYTHM.sm }}>
            Technical &amp; drafting
          </Typography>
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
            {SUITE_TECHNICAL_APPS.map((app) => (
              <Grid key={app.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Surface layer="flat" id={app.id} sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                    {app.workspace}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {app.subtitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                    {app.body}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: MARKETING_RHYTHM.md, flexWrap: "wrap" }}>
                    <Button
                      component="a"
                      href={app.href}
                      target={app.href.startsWith("http") ? "_blank" : undefined}
                      rel={app.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      variant="outlined"
                      color="inherit"
                      size="small"
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px` }}
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
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      Repo
                    </Button>
                  </Stack>
                </Surface>
              </Grid>
            ))}
          </Grid>
          <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, mb: MARKETING_RHYTHM.blockGap }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
              {SHILPIDB.name}
            </Typography>
            <Typography variant="overline" color="text.secondary">
              {SHILPIDB.role}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
              {SHILPIDB.summary}
            </Typography>
            <Button
              component="a"
              href={SHILPIDB.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ mt: MARKETING_RHYTHM.md, textTransform: "none", fontWeight: 700 }}
            >
              ShilpiDB on GitHub
            </Button>
          </SoftSurface>
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
            {[EOMS, ESTI].map((tier) => (
              <Grid key={tier.name} size={{ xs: 12, md: 6 }}>
                <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%" }}>
                  <Stack direction="row" spacing={MARKETING_RHYTHM.sm} sx={{ alignItems: "baseline" }}>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 800 }}>
                      {tier.name}
                    </Typography>
                    <Typography variant="overline" color="text.secondary">
                      {tier.role}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                    {tier.summary}
                  </Typography>
                </SoftSurface>
              </Grid>
            ))}
          </Grid>
          <SoftSurface sx={{ p: { xs: MARKETING_RHYTHM.cardPad, md: MARKETING_RHYTHM.lg } }}>
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

        {/* 4 — Rhythm: three peers (odd) + wellbeing */}
        <Box id="rhythm" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
          <SectionHead
            eyebrow="Rhythm"
            title="Delivery quality needs recovery — built in, not bolted on"
            lead="Deadline pressure is the job. AORMS keeps focus and wellbeing inside the chrome so sharp judgment survives long drawing nights — opt-in, never surveillance."
          />
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.blockGap }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Surface layer="flat" sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                <Box sx={{ color: "text.secondary", display: "flex", mb: MARKETING_RHYTHM.sm }}>
                  <SelfImprovementOutlined fontSize="small" />
                </Box>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  Calm between critical sets
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  Guided breathe, desk stretches, and eye breaks reset attention before the next revision lands — without leaving the workspace.
                </Typography>
              </Surface>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Surface layer="flat" sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  One Pomodoro on the clock
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  Click the orange-ringed analogue clock to start or pause. Drag the crown in 5-minute steps. Double-click to reset. No focus/break theatre — one timer.
                </Typography>
              </Surface>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Surface layer="flat" sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  Opt-in, never a scoreboard
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  ASPRF wellbeing is only 5% of the composite and each person opts themselves in. Coaching signal — not discipline.
                </Typography>
              </Surface>
            </Grid>
          </Grid>
          <LandingWellbeingWidget />
        </Box>

        {/* 5 — Start: open-source suite + FAQ */}
        <Box id="start" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
          <SectionHead
            eyebrow="Start"
            title="Open source for now. Desktop preferred."
            lead="Open source for now. Soft launch: suite home and blog are live. Windows installers and workspace sign-in are coming soon — start with why the suite exists."
          />
          <Grid container spacing={MARKETING_RHYTHM.md} sx={{ mb: MARKETING_RHYTHM.lg }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%" }}>
                <Typography variant="overline" color="text.secondary">
                  Managers
                </Typography>
                <Typography variant="h6" component="h3" sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 700 }}>
                  {AORMS_STUDIO.title} · {AORMS_CONSULTANCY.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  Tasks, office, HR, payroll, and portal communications for architecture and engineering practices.
                </Typography>
              </SoftSurface>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%" }}>
                <Typography variant="overline" color="text.secondary">
                  Technical
                </Typography>
                <Typography variant="h6" component="h3" sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 700 }}>
                  AQC · {AADT.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  Estimation, BBS, and project management on a shared engine; drafting in AADT with geometry in{" "}
                  {SHILPIDB.name}.
                </Typography>
              </SoftSurface>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SoftSurface sx={{ p: MARKETING_RHYTHM.cardPad, height: "100%" }}>
                <Typography variant="overline" color="text.secondary">
                  Online
                </Typography>
                <Typography variant="h6" component="h3" sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 700 }}>
                  Firm portals
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.sm }}>
                  Clients and collaborators see published updates only. This apex site stays marketing and demos.
                </Typography>
              </SoftSurface>
            </Grid>
          </Grid>

          <SoftSurface
            sx={{ p: { xs: MARKETING_RHYTHM.lg, md: MARKETING_RHYTHM.xl }, textAlign: "center", mb: MARKETING_RHYTHM.xl }}
          >
            <Typography variant="h4" component="h3" sx={{ fontWeight: 800 }}>
              Bring the practice onto one suite.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: MARKETING_RHYTHM.md, maxWidth: 520, mx: "auto" }}>
              Explore desktop offers and product repos — clients meet you on the firm portal when you publish.
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
          <Box sx={{ maxWidth: 820 }}>
            {LANDING_FAQ.map((item) => (
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

        <MarketingLandingDock sections={SECTIONS} />
      </Box>
    </MarketingNeuFrame>
  );
}
