import { useEffect, useRef, useState, type RefObject } from "react";
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
  RADIUS,
} from "@hcw/ui-kit";
import { MarketingNeuFrame } from "../components/landing/MarketingTopBar.js";
import { MarketingLandingDock } from "../components/landing/MarketingLandingDock.js";
import { LandingWellbeingWidget } from "../components/landing/LandingWellbeingWidget.js";
import { LandingEntourage } from "../components/landing/LandingEntourage.js";
import { LandingHeroVideo } from "../components/landing/LandingHeroVideo.js";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  LANDING_PRODUCTS,
  SHILPIDB,
  AORMS_STUDIO,
  AORMS_CONSULTANCY,
  ADRAFT,
  EOMS,
  ESTI,
  HUMAN_CENTRIC_WORKS,
} from "../lib/product-nomenclature.js";
import { applyLandingSeo, getLandingFaq, injectLandingJsonLd } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";
import { isMarketingOnly } from "../lib/marketing-gate.js";
import { installersComingSoonForced } from "../lib/desktop-installers.js";
import { MARKETING_CONTENT_GUTTER, MARKETING_RHYTHM, marketingContentColumnSx } from "../lib/marketing-layout.js";
import { LandingAecStrip, LandingProductFigure } from "../components/landing/LandingAecStrip.js";

/**
 * AEC landing IA (odd dock peers):
 * Overview → Outcomes → Audience → Products → Start
 * Hero: brand + copy + poster/video (no AEC building collage). Products: suite catalog.
 */
const SECTIONS = [
  { href: "#top", label: "Overview" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#audience", label: "Audience" },
  { href: "#products", label: "Products" },
  { href: "#start", label: "Start" },
] as const;

type LandingProduct = (typeof LANDING_PRODUCTS)[number];

const AUDIENCE_FIGURE: Record<string, string> = {
  architecture: "/landing/entourage/building-03.png",
  engineering: "/landing/entourage/building-07.png",
};

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
    body: "Managers for the office, AQC for quantities and programme, ADraft for drafting, ShilpiDB for drawings. Firm portals publish updates — no spreadsheet archaeology.",
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
  display,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Larger display face for product / audience bands. */
  display?: boolean;
}) {
  return (
    <Stack
      className="esti-lp-reveal esti-lp-section-head"
      spacing={MARKETING_RHYTHM.sm}
      sx={{ mb: MARKETING_RHYTHM.headMb, maxWidth: display ? 820 : 720 }}
    >
      <Typography
        className="esti-lp-eyebrow"
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: "0.16em", fontFamily: "inherit", fontWeight: 600 }}
      >
        {eyebrow}
      </Typography>
      <Typography
        className={display ? "esti-lp-display" : "esti-lp-section-title"}
        variant="h3"
        component="h2"
        sx={{ fontWeight: display ? 650 : 700, lineHeight: 1.12, letterSpacing: "-0.02em" }}
      >
        {title}
      </Typography>
      {lead ? (
        <Typography
          className="esti-lp-lead"
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 640, lineHeight: 1.6, fontWeight: 450 }}
        >
          {lead}
        </Typography>
      ) : null}
    </Stack>
  );
}

function ProductCtas({ product }: { product: LandingProduct }) {
  const ctaSx = { textTransform: "none", fontWeight: 700, px: 0, minHeight: 44 } as const;
  return (
    <Stack
      className="esti-lp-reveal"
      direction="row"
      spacing={MARKETING_RHYTHM.md}
      sx={{ flexWrap: "wrap", alignItems: "center" }}
    >
      {product.external ? (
        <Button
          component="a"
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          color="inherit"
          size="medium"
          endIcon={<ArrowForward />}
          className="esti-lp-cta-link"
          sx={ctaSx}
        >
          {product.cta}
        </Button>
      ) : (
        <Button
          component={RouterLink}
          to={product.href}
          variant="text"
          color="inherit"
          size="medium"
          endIcon={<ArrowForward />}
          className="esti-lp-cta-link"
          sx={ctaSx}
        >
          {product.cta}
        </Button>
      )}
      {"repo" in product && product.repo ? (
        <Button
          component="a"
          href={product.repo}
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          size="medium"
          className="esti-lp-cta-link"
          sx={{ textTransform: "none", fontWeight: 600, minHeight: 44 }}
        >
          Repo
        </Button>
      ) : null}
    </Stack>
  );
}

function ProductBody({ product }: { product: LandingProduct }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        className="esti-lp-eyebrow"
        sx={{ letterSpacing: "0.1em", fontWeight: 600 }}
      >
        {product.family}
      </Typography>
      <Typography
        variant="h4"
        component="h3"
        sx={{ mt: MARKETING_RHYTHM.sm, fontWeight: 650, letterSpacing: "-0.025em", lineHeight: 1.15 }}
      >
        {product.title}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mt: MARKETING_RHYTHM.sm, mb: MARKETING_RHYTHM.md, lineHeight: 1.65, fontWeight: 450 }}
      >
        {product.lead}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        className="esti-lp-product__meta"
        sx={{ display: "block", mb: MARKETING_RHYTHM.md, letterSpacing: "0.06em" }}
      >
        {product.expansion}
        {product.id !== "portals" ? " · Desktop preferred · Soft launch" : " · Soft launch"}
      </Typography>
      <Stack className="esti-lp-product__updates" spacing={0} sx={{ mb: MARKETING_RHYTHM.lg }}>
        {product.updates.map((line, i) => (
          <Box key={line} className="esti-lp-product__update" sx={{ py: MARKETING_RHYTHM.md }}>
            <Typography className="esti-lp-product__update-n" variant="caption" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65, fontWeight: 450 }}>
              {line}
            </Typography>
          </Box>
        ))}
      </Stack>
      <ProductCtas product={product} />
    </Box>
  );
}

/** One Products surface — all suite apps in a single rail + panel catalog. */
function SuiteProductsCatalog({ activeProduct }: { activeProduct: string | null }) {
  const { hash } = useLocation();
  const hashId = hash.replace(/^#/, "");
  const initial = LANDING_PRODUCTS.some((p) => p.id === hashId) ? hashId : LANDING_PRODUCTS[0]!.id;
  const [active, setActive] = useState(initial);
  const userChoseRef = useRef(false);

  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!LANDING_PRODUCTS.some((p) => p.id === id)) return;
    userChoseRef.current = false;
    setActive(id);
  }, [hash]);

  useEffect(() => {
    if (userChoseRef.current) return;
    if (activeProduct && LANDING_PRODUCTS.some((p) => p.id === activeProduct)) {
      setActive(activeProduct);
    }
  }, [activeProduct]);

  const selected = LANDING_PRODUCTS.find((p) => p.id === active) ?? LANDING_PRODUCTS[0]!;
  const panelId = `suite-panel-${selected.id}`;

  return (
    <Box className="esti-lp-reveal esti-lp-vacc esti-lp-vacc--suite" sx={{ maxWidth: 1080 }}>
      <nav className="esti-lp-vacc__rail" aria-label="AORMS suite products">
        {LANDING_PRODUCTS.map((product) => {
          const open = product.id === selected.id;
          return (
            <button
              key={product.id}
              type="button"
              id={product.id}
              data-product={product.id}
              className={open ? "esti-lp-vacc__tab esti-lp-vacc__tab--active" : "esti-lp-vacc__tab"}
              aria-current={open ? "true" : undefined}
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => {
                userChoseRef.current = true;
                setActive(product.id);
                if (typeof window !== "undefined" && window.history?.replaceState) {
                  window.history.replaceState(null, "", `#${product.id}`);
                }
              }}
            >
              <span className="esti-lp-vacc__tab-family">{product.family}</span>
              <span className="esti-lp-vacc__tab-title">{product.title}</span>
            </button>
          );
        })}
      </nav>
      <Box
        id={panelId}
        role="region"
        aria-labelledby={selected.id}
        className="esti-lp-vacc__panel esti-lp-vacc__panel--suite"
        data-product={selected.id}
      >
        <div className="esti-lp-vacc__panel-grid">
          <LandingProductFigure productId={selected.id} title={selected.title} />
          <ProductBody product={selected} />
        </div>
      </Box>
    </Box>
  );
}

function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

function useHeroPointer(homeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = homeRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      root.style.setProperty("--lp-px", `${x.toFixed(2)}%`);
      root.style.setProperty("--lp-py", `${y.toFixed(2)}%`);
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    return () => root.removeEventListener("pointermove", onMove);
  }, [homeRef]);
}

function useActiveProduct() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = LANDING_PRODUCTS.map((p) => p.id);
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }
        let best = "";
        let bestR = 0;
        for (const [id, ratio] of visible) {
          if (ratio >= bestR) {
            bestR = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.2, 0.45, 0.7] },
    );
    for (const id of ids) {
      const n = document.getElementById(id);
      if (n) io.observe(n);
    }
    return () => io.disconnect();
  }, []);
  return active;
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

/** Single-page AORMS suite landing — typography-led for architects & engineers. */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const { hash } = useLocation();
  const homeRef = useRef<HTMLDivElement>(null);
  const [audienceFocus, setAudienceFocus] = useState<"architecture" | "engineering" | null>(null);
  const progress = useScrollProgress();
  const activeProduct = useActiveProduct();
  useLandingReveal();
  useHeroPointer(homeRef);

  useEffect(() => {
    applyLandingSeo();
    injectLandingJsonLd();
  }, []);

  useEffect(() => {
    // Legacy #aadt → #adraft (ADraft rebrand).
    const raw = hash.replace(/^#/, "");
    const section = raw === "aadt" ? "adraft" : raw;
    if (!section) return;
    if (raw === "aadt" && typeof window !== "undefined") {
      window.history.replaceState(null, "", "#adraft");
    }
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <MarketingNeuFrame hideTopBar>
      <Box
        ref={homeRef}
        className="esti-lp-aec-home esti-lp-atelier"
        sx={{ position: "relative", width: "100%" }}
      >
        <div
          className="esti-lp-scroll-progress"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden
        />
        <div className="esti-lp-atelier-grid" aria-hidden />
        <LandingEntourage count={12} seed={77} />

        {/* 1 — Overview: brand + poster/video */}
        <Box
          id="top"
          component="section"
          className="esti-lp-hero-bleed esti-lp-hero-bleed--dark esti-lp-hero-bleed--video"
        >
          <LandingHeroVideo />
          <div className="esti-lp-hero-bleed__grade" aria-hidden />
          <div className="esti-lp-hero-bleed__spot" aria-hidden />
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
                className="esti-lp-hero-in esti-lp-hero-in--2 esti-lp-eyebrow"
                variant="overline"
                sx={{ mt: MARKETING_RHYTHM.sm, letterSpacing: "0.14em", display: "block", fontWeight: 600 }}
              >
                {AORMS_PLATFORM.expansion}
              </Typography>
              <Typography
                className="esti-lp-hero-in esti-lp-hero-in--3 esti-lp-hero-display"
                variant="h3"
                component="h1"
                sx={{
                  mt: MARKETING_RHYTHM.md,
                  fontWeight: 650,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  maxWidth: 760,
                }}
              >
                {AORMS_PLATFORM.heroHeadline[0]}
              </Typography>
              <Typography
                className="esti-lp-hero-in esti-lp-hero-in--4 esti-lp-lead"
                variant="body1"
                sx={{ mt: MARKETING_RHYTHM.md, mb: MARKETING_RHYTHM.lg, maxWidth: 540, lineHeight: 1.65, fontWeight: 450 }}
              >
                {AORMS_PLATFORM.heroSupport}
              </Typography>
              <Stack
                className="esti-lp-hero-in esti-lp-hero-in--5"
                direction="row"
                spacing={MARKETING_RHYTHM.sm}
                sx={{ flexWrap: "wrap", gap: MARKETING_RHYTHM.sm }}
              >
                {isMarketingOnly() ? (
                  <Button
                    component={RouterLink}
                    to="/downloads"
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForward />}
                    className="esti-lp-cta-primary"
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
                    className="esti-lp-cta-primary"
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: `${RADIUS}px`, minHeight: 48, px: 3 }}
                  >
                    Firm portal demos
                  </Button>
                )}
                <Button
                  component="a"
                  href="#products"
                  variant="outlined"
                  color="inherit"
                  className="esti-lp-cta-ghost"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: `${RADIUS}px`, minHeight: 48 }}
                >
                  Explore products
                </Button>
                <Button
                  component={RouterLink}
                  to="/blog"
                  variant="text"
                  color="inherit"
                  className="esti-lp-cta-link"
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
          {/* 2 — Outcomes: numbered interactive bands */}
          <Box id="outcomes" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SectionHead
              eyebrow="Outcomes"
              title="What changes when the practice runs on one record"
              lead="Not another dashboard — fee recovery, delivery quality, and trusted answers stop competing with tool chaos."
              display
            />
            <Stack className="esti-lp-outcome-list" spacing={0}>
              {OUTCOMES.map((o, i) => (
                <Stack
                  key={o.title}
                  className="esti-lp-reveal esti-lp-outcome-row"
                  direction="row"
                  spacing={MARKETING_RHYTHM.md}
                  sx={{ alignItems: "flex-start", py: MARKETING_RHYTHM.lg }}
                  tabIndex={0}
                >
                  <Typography className="esti-lp-outcome-n" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </Typography>
                  <Box sx={{ color: "text.secondary", display: "flex", mt: 0.5 }} aria-hidden>
                    {o.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.25 }}
                    >
                      {o.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mt: MARKETING_RHYTHM.sm, maxWidth: 640, lineHeight: 1.65, fontWeight: 450 }}
                    >
                      {o.body}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* 3 — Audience: architecture / engineering with AEC figures */}
          <Box id="audience" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <SectionHead
              eyebrow="Audience"
              title="Drawn for architects and engineers"
              lead="AEC consulting firms — not generic SaaS personas. Two practice managers on one suite spine."
              display
            />
            <Grid container spacing={0} className="esti-lp-audience-split">
              {AUDIENCE.map((a) => {
                const focused = audienceFocus === a.id || audienceFocus === null;
                return (
                  <Grid key={a.id} size={{ xs: 12, md: 6 }}>
                    <Box
                      className={[
                        "esti-lp-reveal",
                        "esti-lp-audience-peer",
                        audienceFocus === a.id ? "esti-lp-audience-peer--on" : "",
                        audienceFocus && audienceFocus !== a.id ? "esti-lp-audience-peer--dim" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => setAudienceFocus(a.id as "architecture" | "engineering")}
                      onMouseLeave={() => setAudienceFocus(null)}
                      onFocus={() => setAudienceFocus(a.id as "architecture" | "engineering")}
                      onBlur={() => setAudienceFocus(null)}
                      tabIndex={0}
                      sx={{ opacity: focused ? 1 : undefined }}
                    >
                      <Stack spacing={MARKETING_RHYTHM.md}>
                        <figure className="esti-lp-audience-fig" aria-hidden>
                          <img
                            src={AUDIENCE_FIGURE[a.id]}
                            alt=""
                            width={200}
                            height={200}
                            loading="lazy"
                            decoding="async"
                          />
                        </figure>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Box sx={{ color: "primary.main", display: "flex" }} aria-hidden>
                            {a.icon}
                          </Box>
                          <Typography className="esti-lp-eyebrow" variant="overline" color="text.secondary">
                            {a.product}
                          </Typography>
                        </Stack>
                        <Typography
                          className="esti-lp-audience-title"
                          variant="h4"
                          component="h3"
                          sx={{ fontWeight: 650, letterSpacing: "-0.025em", lineHeight: 1.15 }}
                        >
                          {a.title}
                        </Typography>
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ lineHeight: 1.65, maxWidth: 420, fontWeight: 450 }}
                        >
                          {a.body}
                        </Typography>
                        <Button
                          component="a"
                          href={a.id === "architecture" ? "#studio" : "#consultancy"}
                          variant="text"
                          color="inherit"
                          endIcon={<ArrowForward />}
                          className="esti-lp-cta-link"
                          sx={{ textTransform: "none", fontWeight: 700, px: 0, alignSelf: "flex-start", minHeight: 44 }}
                        >
                          See {a.product}
                        </Button>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* 4 — Products: one AEC suite catalog */}
          <Box id="products" component="section" sx={{ py: MARKETING_RHYTHM.sectionY }}>
            <LandingAecStrip variant="section" />

            <SectionHead
              eyebrow="Products"
              title="One AEC suite. Dedicated apps."
              lead={`Architecture, engineering, and construction consulting — Connect launches managers and local technical tools. ${AORMS_PLATFORM.aecDisciplines.join(" · ")}. Installers remain Coming soon.`}
              display
            />

            <SuiteProductsCatalog activeProduct={activeProduct} />

            <Box
              id="intelligence"
              component="section"
              sx={{
                py: MARKETING_RHYTHM.sectionY,
                borderTop: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <SectionHead
                eyebrow="Intelligence"
                title={`${ESTI.name} on the desk. ${EOMS.name} in the bank.`}
                lead="AI stays local on practice managers. The knowledge bank stays a separate API — never a third-party training sink."
              />
              <Grid container spacing={MARKETING_RHYTHM.md}>
                {[ESTI, EOMS].map((tier) => (
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
            </Box>

            <SoftSurface className="esti-lp-reveal" sx={{ p: { xs: MARKETING_RHYTHM.cardPad, md: MARKETING_RHYTHM.lg }, mt: MARKETING_RHYTHM.lg }}>
              <KpiStrip
                aria-label="AORMS suite at a glance"
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
                    AQC · {ADRAFT.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimation, BBS, and project management on a shared engine; drafting in ADraft (Urbanist type, local .vdb) with geometry in{" "}
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
          revealAfterId="top"
          signInHref={isMarketingOnly() ? "/" : "/login?tab=portals"}
          signInLabel={isMarketingOnly() ? "Home" : "Sign in"}
        />
      </Box>
    </MarketingNeuFrame>
  );
}
