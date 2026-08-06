import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
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
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import HubOutlined from "@mui/icons-material/HubOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import DnsOutlined from "@mui/icons-material/DnsOutlined";
import LayersOutlined from "@mui/icons-material/LayersOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import {
  GlassRail,
  KpiStrip,
  SectionDock,
  StatusDot,
  Surface,
  type SectionDockLink,
} from "@hcw/ui-kit";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  PLATFORM_FRAMEWORKS,
  PLATFORM_APPS,
  AORMS_STUDIO,
  AORMS_CONSULTANCY,
  EOMS,
  ESTI,
  HUMAN_CENTRIC_WORKS,
} from "../lib/product-nomenclature.js";
import { applyLandingSeo, injectLandingJsonLd } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/** Section anchors — the marketing scroll-spy dock (SectionDock, fixed bottom). */
const SECTIONS: readonly SectionDockLink[] = [
  { href: "#top", label: "Overview" },
  { href: "#frameworks", label: "Frameworks" },
  { href: "#inside", label: "Features" },
  { href: "#why", label: "Why AORMS" },
  { href: "#how", label: "How it works" },
  { href: "#apps", label: "Apps" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const MODULES = [
  {
    icon: <FolderOutlined fontSize="small" />,
    title: "Projects & phases",
    body: "Every engagement, its phases, tasks, drawings, and decisions on one spine.",
  },
  {
    icon: <ReceiptLongOutlined fontSize="small" />,
    title: "Proposals & GST invoicing",
    body: "COA fee proposals, scope agreements, and compliant invoicing in one flow.",
  },
  {
    icon: <ArchitectureOutlined fontSize="small" />,
    title: "Drawings & transmittals",
    body: "A governed drawing register with issue tracking and document transmittals.",
  },
  {
    icon: <MenuBookOutlined fontSize="small" />,
    title: "Governed library",
    body: "Compliance, standards, and master plans — validated, versioned, and searchable.",
  },
  {
    icon: <GroupsOutlined fontSize="small" />,
    title: "Team, HR & performance",
    body: "Roster, assignments, leave, payroll, and the rolling ASPRF performance score.",
  },
  {
    icon: <InsightsOutlined fontSize="small" />,
    title: "Studio Intelligence",
    body: "A live dashboard and Ask ESTI — answers drawn only from your validated data.",
  },
] as const;

/** Why choose AORMS — benefit-framed (outcome), not feature-framed. */
const BENEFITS = [
  {
    icon: <PaymentsOutlined fontSize="small" />,
    title: "Stop losing fees to revisions",
    body: "COA proposals, revision intelligence, and GST invoices on one record — so scope changes bill correctly instead of leaking margin.",
  },
  {
    icon: <HubOutlined fontSize="small" />,
    title: "One record, no re-keying",
    body: "Projects, drawings, finance, team, and portals share a single spine. No exports, no reconciled spreadsheets, no version drift.",
  },
  {
    icon: <VerifiedUserOutlined fontSize="small" />,
    title: "AI you can actually trust",
    body: `${ESTI.name} answers only from your firm's validated repositories — every answer traceable to a source, not a guess from the open web.`,
  },
  {
    icon: <DnsOutlined fontSize="small" />,
    title: "Runs on your server",
    body: "Firm data stays in your environment, and nothing is used to train third-party models. AI runs on your own infrastructure — local on desktop, the hub on web.",
  },
] as const;

/** How it works — three governed steps. */
const STEPS = [
  {
    icon: <LayersOutlined fontSize="small" />,
    title: "Consolidate",
    body: "Bring the whole office onto one spine — projects, fees, drawings, team, and portals replace the 5–7 disconnected tools.",
  },
  {
    icon: <RuleOutlined fontSize="small" />,
    title: "Govern",
    body: "Standards, review chains, and audit trails make the practice run the same way whoever is at the desk — versioned and shared.",
  },
  {
    icon: <AutoAwesomeOutlined fontSize="small" />,
    title: "Act with intelligence",
    body: `Studio Intelligence surfaces what needs attention, and ${ESTI.name} answers from your validated data — decisions on evidence, not memory.`,
  },
] as const;

/** Factual platform figures — structural, not fabricated customer metrics. */
const STATS = [
  { id: "apps", label: "AEC apps on one spine", value: "3" },
  { id: "modules", label: "Consolidated modules", value: "80+" },
  { id: "ai", label: "AI tiers · EOMS + ESTI", value: "Dual" },
  { id: "storage", label: "Storage included", value: "5 GB" },
] as const;

const FAQ = [
  {
    q: "Who is AORMS for?",
    a: `${AORMS_PLATFORM.audience}.`,
  },
  {
    q: "Is my data used to train external models?",
    a: `No. ${ESTI.name} answers only from your validated firm repositories, running on your own infrastructure — nothing is sent to or used to train third-party models.`,
  },
  {
    q: "What is the difference between EOMS and ESTI?",
    a: `${EOMS.name} is the external knowledge bank — standard codebooks and compliance codes on tap via its API. ${ESTI.name} is the internal agent that answers only from your firm's validated repositories.`,
  },
  {
    q: "Which apps ship today?",
    a: `${AORMS_STUDIO.title} (architecture) and ${AORMS_CONSULTANCY.title} (engineering) are both live on the same spine — ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")} and ${AORMS_CONSULTANCY.appUrl.replace(/^https:\/\//, "")}.`,
  },
  {
    q: "How much does it cost?",
    a: `One Standard licence — unlimited users, full workspace, 5 GB cloud storage included. You pay only for cloud storage above 5 GB. AI is unmetered — it runs locally on your desktop node, and on the hub for web parity (no per-token billing, no bring-your-own key). Desktop node (local-first) + web parity share the same licence; no Lite/Pro tiers. See Pricing below.`,
  },
  {
    q: "Who should start with AORMS first?",
    a: `Architecture studios of about 5–25 people in India who lose fee recovery to revisions and site chaos — COA proposals, GST invoices, drawings, and a client portal on one record. Engineering consultancies use ${AORMS_CONSULTANCY.title} on the same spine.`,
  },
] as const;

/** Calm section opener — overline + heading + optional lead. */
function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
}) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        mb: 4,
        maxWidth: 720,
        ...(align === "center" ? { mx: "auto", textAlign: "center" } : null),
      }}
    >
      <Typography variant="overline" color="primary" sx={{ letterSpacing: "0.14em" }}>
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h2" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
        {title}
      </Typography>
      {lead ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 620, ...(align === "center" ? { mx: "auto" } : null) }}
        >
          {lead}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** Colourless skeleton bar — abstract placeholder, no fabricated data. */
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

/**
 * Abstract workspace preview for the hero — the rail · stage spatial model
 * rendered as generic surfaces. No client names or fabricated metrics; the
 * shape communicates the product, the labels stay real.
 */
function WorkspacePreview() {
  return (
    <Surface
      layer="soft"
      aria-hidden
      sx={{ p: { xs: 2, md: 2.5 }, height: "100%" }}
    >
      <Stack direction="row" spacing={1.5} sx={{ height: "100%" }}>
        {/* Rail */}
        <Surface
          layer="glass"
          sx={{
            width: 84,
            flexShrink: 0,
            p: 1.5,
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <AormsLogo variant="sm" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Bar key={i} w={i === 0 ? "70%" : "100%"} />
          ))}
        </Surface>

        {/* Stage */}
        <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Studio Intelligence
            </Typography>
            <StatusDot color="green" label="Live" size="sm" />
          </Stack>

          {/* KPI tiles */}
          <Grid container spacing={1}>
            {["Projects", "Proposals", "Invoices"].map((k) => (
              <Grid key={k} size={4}>
                <Surface layer="flat" sx={{ p: 1.25, border: (t) => `1px solid ${t.palette.divider}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                    {k}
                  </Typography>
                  <Bar w="55%" />
                </Surface>
              </Grid>
            ))}
          </Grid>

          {/* Table skeleton */}
          <Surface layer="flat" sx={{ p: 1.5, flex: 1, border: (t) => `1px solid ${t.palette.divider}` }}>
            <Stack spacing={1.25}>
              {[92, 78, 85, 64, 72].map((w, i) => (
                <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <StatusDot
                    color={i % 3 === 0 ? "gray" : "green"}
                    label=""
                    size="sm"
                    shape={i % 3 === 0 ? "triangle" : "circle"}
                  />
                  <Bar w={`${w}%`} />
                </Stack>
              ))}
            </Stack>
          </Surface>
        </Stack>
      </Stack>
    </Surface>
  );
}

/** Single-page AORMS platform landing — the only marketing surface. */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const { pathname, hash } = useLocation();

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

  const rail = (
    <Stack sx={{ height: "100%", minHeight: { md: "calc(100vh - 32px)" } }} spacing={3}>
      <Box>
        <RouterLink to="/" aria-label="AORMS home" style={{ display: "inline-block" }}>
          <AormsLogo variant="rail" />
        </RouterLink>
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1, letterSpacing: "0.04em" }}
        >
          {AORMS_PLATFORM.expansion}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {AORMS_PLATFORM.tagline}. One governed system for how your office runs and how
        engagements are delivered.
      </Typography>

      <Button
        component={RouterLink}
        to="/login"
        variant="contained"
        endIcon={<ArrowForward />}
        sx={{ alignSelf: "flex-start" }}
      >
        Sign in
      </Button>

      <Box sx={{ flex: 1 }} />

      <Stack spacing={0.5}>
        <Divider sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {HUMAN_CENTRIC_WORKS.attribution}
        </Typography>
        {visitCount != null ? (
          <Typography variant="caption" color="text.disabled">
            {visitCount.toLocaleString()} visits
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );

  return (
    <>
      <GlassRail glass="clear" mainId="lp-main" rail={rail} railAriaLabel="AORMS">
        <Container maxWidth="lg" disableGutters sx={{ pb: 12 }}>
          {/* Hero — two-column: copy + workspace preview */}
          <Box id="top" component="section" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 6, md: 9 } }}>
            <Grid container spacing={{ xs: 5, md: 6 }} sx={{ alignItems: "center" }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ mb: 2 }}>
                  <AormsLogo variant="hero" />
                </Box>
                <Typography variant="overline" color="primary" sx={{ letterSpacing: "0.14em" }}>
                  The operating system for AEC consulting
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    mt: 2,
                    fontWeight: 800,
                    fontSize: { xs: "2.4rem", md: "3.4rem" },
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {AORMS_PLATFORM.heroHeadline[0]}
                  <Box component="span" sx={{ display: "block", color: "text.secondary" }}>
                    {AORMS_PLATFORM.heroHeadline[1]}
                  </Box>
                </Typography>
                <Typography
                  variant="h6"
                  component="p"
                  color="text.secondary"
                  sx={{ mt: 3, maxWidth: 560, fontWeight: 400 }}
                >
                  Architecture and engineering practices advise clients across dozens of
                  disconnected tools. AORMS consolidates the operational and design frameworks
                  of the whole office into one governed workspace, with dual-tier AI.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
                  <Button
                    component={RouterLink}
                    to="/login"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                  >
                    Sign in to {AORMS_STUDIO.title}
                  </Button>
                  <Button component="a" href="#how" variant="outlined" size="large">
                    See how it works
                  </Button>
                </Stack>

                {/* Trust indicator */}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 3, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
                >
                  <StatusDot color="green" label="" size="sm" />
                  <Typography variant="caption" color="text.secondary">
                    Two apps live on one spine · runs on your server · AI runs local,
                    unmetered
                  </Typography>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ height: { xs: 340, md: 400 } }}>
                  <WorkspacePreview />
                </Box>
              </Grid>
            </Grid>

            {/* From fragmented tools → one system. */}
            <Surface layer="soft" sx={{ mt: { xs: 6, md: 8 }, p: { xs: 2.5, md: 3 } }}>
              <Typography variant="overline" color="text.secondary">
                Replaces the sprawl
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                {AORMS_PLATFORM.fragmentedTools.map((tool) => (
                  <Typography
                    key={tool}
                    variant="body2"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      color: "text.secondary",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    {tool}
                  </Typography>
                ))}
                <Typography
                  variant="body2"
                  sx={{ px: 1.5, py: 0.5, fontWeight: 700, color: "primary.main" }}
                >
                  → one operating system
                </Typography>
              </Stack>
            </Surface>
          </Box>

          {/* Frameworks */}
          <Box id="frameworks" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Two frameworks"
              title="Every consulting office runs on two layers"
              lead="AORMS makes both explicit, versioned, and shared — so the practice runs the same way whoever is at the desk."
            />
            <Grid container spacing={3}>
              {Object.values(PLATFORM_FRAMEWORKS).map((fw) => (
                <Grid key={fw.title} size={{ xs: 12, md: 6 }}>
                  <Surface layer="flat" sx={{ p: 3, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                      {fw.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                      {fw.summary}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Inside — modules (features) */}
          <Box id="inside" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Inside the workspace"
              title="Everything the practice needs, consolidated"
              lead="One workspace for the whole consulting office — no exports, no re-keying, no scattered spreadsheets."
            />
            <Grid container spacing={3}>
              {MODULES.map((m) => (
                <Grid key={m.title} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Surface layer="flat" sx={{ p: 3, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <Box sx={{ color: "primary.main", display: "flex" }}>{m.icon}</Box>
                    <Typography variant="subtitle1" component="h3" sx={{ mt: 1.5, fontWeight: 700 }}>
                      {m.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {m.body}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Why choose us — benefits */}
          <Box id="why" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Why AORMS"
              title="Outcomes, not just features"
              lead="What a consolidated, governed, audit-first workspace actually changes for the practice."
            />
            <Grid container spacing={3}>
              {BENEFITS.map((b) => (
                <Grid key={b.title} size={{ xs: 12, sm: 6 }}>
                  <Surface layer="flat" sx={{ p: 3, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                      <Box sx={{ color: "primary.main", display: "flex", mt: 0.25 }}>{b.icon}</Box>
                      <Box>
                        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                          {b.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {b.body}
                        </Typography>
                      </Box>
                    </Stack>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* How it works */}
          <Box id="how" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="How it works"
              title="Consolidate. Govern. Act."
              lead="One path from scattered tools to a governed practice with intelligence you can trust."
            />
            <Grid container spacing={3}>
              {STEPS.map((s, i) => (
                <Grid key={s.title} size={{ xs: 12, md: 4 }}>
                  <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
                        {i + 1}
                      </Typography>
                      <Box sx={{ color: "primary.main", display: "flex" }}>{s.icon}</Box>
                    </Stack>
                    <Typography variant="subtitle1" component="h3" sx={{ mt: 2, fontWeight: 700 }}>
                      {s.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {s.body}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Statistics — factual platform figures */}
          <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
            <Surface layer="soft" sx={{ p: { xs: 3, md: 4 } }}>
              <KpiStrip
                aria-label="AORMS platform at a glance"
                items={STATS.map((s) => ({
                  id: s.id,
                  label: s.label,
                  value: (
                    <Box component="span" sx={{ fontSize: "1.9rem", fontWeight: 800, color: "primary.main" }}>
                      {s.value}
                    </Box>
                  ),
                }))}
              />
              {visitCount != null ? (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: "block" }}>
                  {visitCount.toLocaleString()} visits to this page and counting.
                </Typography>
              ) : null}
            </Surface>
          </Box>

          {/* Dual-tier AI */}
          <Box id="ai" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Dual-tier AI"
              title="Knowledge bank outside. Firm agent inside."
              lead="Codes and compliance come from EOMS. Answers come only from what your firm has validated."
            />
            <Grid container spacing={3}>
              {[EOMS, ESTI].map((tier) => (
                <Grid key={tier.name} size={{ xs: 12, md: 6 }}>
                  <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
                      <Typography variant="h5" component="h3" sx={{ fontWeight: 800 }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="overline" color="primary">
                        {tier.role}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.disabled" component="p" sx={{ mt: 0.5 }}>
                      {tier.expansion}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      {tier.summary}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Apps */}
          <Box id="apps" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Apps on one spine"
              title="Architecture, engineering, and project management."
              lead="Each AEC discipline runs on the same operational spine — deployed as a focused app."
            />
            <Grid container spacing={3}>
              {PLATFORM_APPS.map((app) => (
                <Grid key={app.id} size={{ xs: 12, md: 4 }}>
                  <Surface
                    layer="soft"
                    id={app.id}
                    sx={{ p: 3, height: "100%" }}
                  >
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
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
                          color: app.status === "live" ? "primary.main" : "text.disabled",
                          border: (t) =>
                            `1px solid ${app.status === "live" ? t.palette.primary.main : t.palette.divider}`,
                        }}
                      >
                        {app.status === "live"
                          ? "Live"
                          : app.status === "preview"
                            ? "Preview"
                            : "Roadmap"}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {app.subtitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {app.body}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {app.bullets.map((b) => (
                        <Typography key={b} variant="body2" sx={{ display: "flex", gap: 1 }}>
                          <Box component="span" sx={{ color: "primary.main", fontWeight: 700 }}>
                            —
                          </Box>
                          {b}
                        </Typography>
                      ))}
                    </Stack>
                    <Button
                      component="a"
                      href={app.href}
                      variant="contained"
                      size="medium"
                      endIcon={<ArrowForward />}
                      sx={{ mt: 3 }}
                    >
                      {app.cta}
                    </Button>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Pricing — one Standard licence (PLANS-AND-TIERS). */}
          <Box id="pricing" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Pricing"
              title="One Standard licence."
              lead="No tiers. Unlimited users. Pay only for cloud storage over 5 GB — AI is unmetered (local on desktop, hub on web)."
            />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                  <Typography variant="overline" color="primary">Included</Typography>
                  <Typography variant="h6" component="h3" sx={{ mt: 1, fontWeight: 700 }}>
                    Full workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    ACTIVE licence from signup — projects, fees, GST invoices, drawings,
                    portals, Studio Intelligence, and {AORMS_CONSULTANCY.title} on the same spine.
                    Unlimited staff logins.
                  </Typography>
                </Surface>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                  <Typography variant="overline" color="primary">Storage</Typography>
                  <Typography variant="h6" component="h3" sx={{ mt: 1, fontWeight: 700 }}>
                    5 GB included
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Drawings and firm files. Extra storage billed per GB-month when you grow —
                    no surprise edition upgrades.
                  </Typography>
                </Surface>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                  <Typography variant="overline" color="primary">AI</Typography>
                  <Typography variant="h6" component="h3" sx={{ mt: 1, fontWeight: 700 }}>
                    Local & unmetered
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {ESTI.name} runs locally on your desktop node — unmetered, no per-token
                    billing. On web it runs on the hub (Hosted AI), also unmetered. No
                    bring-your-own key needed.
                  </Typography>
                </Surface>
              </Grid>
            </Grid>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
              <Button
                component={RouterLink}
                to="/account?mode=create"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
              >
                Create account
              </Button>
              <Button component={RouterLink} to="/login" variant="outlined" size="large">
                Sign in
              </Button>
            </Stack>
          </Box>

          {/* CTA band — the live (glass) layer. */}
          <Surface layer="glass" component="section" sx={{ my: { xs: 6, md: 9 }, p: { xs: 4, md: 6 }, textAlign: "center" }}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 800 }}>
              Bring your practice onto one system.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560, mx: "auto" }}>
              Sign in to {AORMS_STUDIO.title} or {AORMS_CONSULTANCY.title} — same platform,
              discipline-fit workspace.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center", mt: 4 }}>
              <Button component={RouterLink} to="/login" variant="contained" size="large" endIcon={<ArrowForward />}>
                {AORMS_STUDIO.title}
              </Button>
              <Button
                component="a"
                href={AORMS_CONSULTANCY.appUrl}
                variant="outlined"
                size="large"
                endIcon={<ArrowForward />}
              >
                {AORMS_CONSULTANCY.title}
              </Button>
              <Button
                component="a"
                href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}
                variant="text"
                size="large"
              >
                Talk to HCW
              </Button>
            </Stack>
          </Surface>

          {/* FAQ — accordion */}
          <Box id="faq" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead eyebrow="Questions" title="What practices ask first" />
            <Box sx={{ maxWidth: 820 }}>
              {FAQ.map((item) => (
                <Accordion
                  key={item.q}
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
                      {item.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                      {item.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>

          {/* Footer */}
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
                <Typography variant="overline" color="text.secondary">Product</Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Box component="a" href="#inside" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Features</Typography>
                  </Box>
                  <Box component="a" href="#apps" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Apps</Typography>
                  </Box>
                  <Box component="a" href="#pricing" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Pricing</Typography>
                  </Box>
                  <Box component="a" href="#faq" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">FAQ</Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="overline" color="text.secondary">Company</Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Box component={RouterLink} to="/login" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Sign in</Typography>
                  </Box>
                  <Box component={RouterLink} to="/account?mode=create" sx={{ color: "text.secondary", textDecoration: "none" }}>
                    <Typography variant="body2">Create account</Typography>
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
      </GlassRail>

      <SectionDock links={SECTIONS} pathname={pathname} hash={hash} aria-label="Page sections" />
    </>
  );
}
