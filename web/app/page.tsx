import { redirect } from "next/navigation";
import Link from "next/link";
import { Accordion, AccordionItem, Column, Grid, Tag, Tile } from "@carbon/react";
import { createClient } from "../lib/supabase/server";
import { roleHome } from "../lib/auth/role-home";
import { BandCtas, HeroCtas } from "../components/aorms/LandingButtons";
import {
  AORMS_PLATFORM,
  BRIEF,
  ESTI,
  FAQ,
  FEE_PROPOSAL,
  HUMAN_CENTRIC_WORKS,
  SPECIFICATION,
} from "../lib/marketing-content";

const PAGE_MAX = 1200;
const SECTION_PAD = "clamp(3rem, 6vw, 6rem) 0";

/**
 * web/'s public marketing landing page — this route was a bare auth
 * redirect until now (see the "not part of the migration spec" cross-
 * cutting rows in ROADMAP-CLOUD.md: nothing in `web/` ever served a
 * marketing surface). Content is a trimmed port of frontend/src/routes/
 * Landing.tsx's copy (that page stays live on aorms.in today, still on
 * the old React/MUI+hcw-ui-kit stack) — rebuilt here in stock
 * `@carbon/react` only, matching CLAUDE.md's Pure Carbon rule that
 * `web/` already follows everywhere else, rather than porting the old
 * page's MUI/`@hcw/ui-kit` marketing chrome (`MarketingNeuFrame` etc.)
 * verbatim. Signed-in visitors land on their role's home (`/dashboard` for
 * staff, `/portal` for a client — see `lib/auth/role-home.ts`); signed-out
 * visitors get this page with a "Sign in" link to the existing
 * `(auth)/login` route, not an embedded auth form.
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    redirect(roleHome(profile?.role) ?? "/login");
  }
  if (data?.claims) redirect("/dashboard");

  return (
    <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "0 1rem" }}>
      {/* Cover */}
      <section id="top" style={{ padding: SECTION_PAD }}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Tag type="green" size="sm">
                Live
              </Tag>
            </div>
            <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Plain <img>, not next/image — a static marketing asset, no optimization needed */}
              <img src="/aorms-logo.png" alt="AORMS" style={{ height: "40px", width: "auto" }} />
            </div>
            <p
              className="cds--type-productive-heading-01"
              style={{ marginTop: "1.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              {AORMS_PLATFORM.expansion}
            </p>
            <h1 className="cds--type-display-02" style={{ marginTop: "0.75rem", maxWidth: 760 }}>
              {AORMS_PLATFORM.heroHeadline}
            </h1>
            <p className="cds--type-body-02" style={{ marginTop: "1rem", maxWidth: 560, color: "var(--cds-text-secondary)" }}>
              {AORMS_PLATFORM.heroSupport}
            </p>
            <HeroCtas />
            <p className="cds--type-caption-01" style={{ marginTop: "2rem", color: "var(--cds-text-secondary)" }}>
              One web hub · cloud-hosted · AI runs on your own data, unmetered
            </p>
          </Column>
        </Grid>
      </section>

      {/* Brief */}
      <section id="brief" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              The Brief
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              What changes when the practice runs on one record
            </h2>
          </Column>
          {BRIEF.map((o) => (
            <Column key={o.n} sm={4} md={8} lg={16} style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1.5rem" }}>
                <span className="cds--type-heading-05" aria-hidden style={{ color: "var(--cds-text-placeholder)", minWidth: "3rem" }}>
                  {o.n}
                </span>
                <div>
                  <h3 className="cds--type-productive-heading-03">{o.title}</h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.5rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
                    {o.body}
                  </p>
                </div>
              </div>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Specification — module schedule */}
      <section id="specification" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Specification
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              The module schedule
            </h2>
          </Column>
          {SPECIFICATION.map((f) => (
            <Column key={f.code} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-code-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {f.code}
                </p>
                <h3 className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
                  {f.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {f.body}
                </p>
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Intelligence */}
      <section id="intelligence" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Intelligence
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              {ESTI.name} on the desk.
            </h2>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <Tile style={{ height: "100%" }}>
              <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                Internal AI agent
              </p>
              <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                {ESTI.name}
              </h3>
              <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                {ESTI.summary}
              </p>
            </Tile>
          </Column>
        </Grid>
      </section>

      {/* Fee proposal */}
      <section id="fee-proposal" style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              Fee Proposal
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              One Standard licence.
            </h2>
          </Column>
          {FEE_PROPOSAL.map((p) => (
            <Column key={p.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
                  {p.eyebrow}
                </p>
                <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
                  {p.title}
                </h3>
                <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                  {p.body}
                </p>
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* CTA band */}
      <section style={{ padding: SECTION_PAD, borderTop: "1px solid var(--cds-border-subtle)", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <h2 className="cds--type-heading-05">Bring the practice onto one hub.</h2>
            <p className="cds--type-body-02" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              Architecture studios — sign in and start managing the office on one hub.
            </p>
            <BandCtas />
          </Column>
        </Grid>
      </section>

      {/* RFI (FAQ) */}
      <section id="rfi" style={{ padding: SECTION_PAD }}>
        <Grid>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
            <p
              className="cds--type-productive-heading-01"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
            >
              RFI
            </p>
            <h2 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
              Requests for information practices ask first
            </h2>
          </Column>
          <Column sm={4} md={8} lg={12}>
            <Accordion>
              {FAQ.map((item) => (
                <AccordionItem key={item.question} title={item.question}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {item.answer}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          </Column>
        </Grid>
      </section>

      {/* Footer */}
      <footer style={{ padding: "3rem 0", borderTop: "1px solid var(--cds-border-subtle)" }}>
        <Grid>
          <Column sm={4} md={4} lg={6}>
            {/* Plain <img>, not next/image — a static marketing asset, no optimization needed */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
            <p className="cds--type-body-01" style={{ marginTop: "0.75rem", maxWidth: 380, color: "var(--cds-text-secondary)" }}>
              {AORMS_PLATFORM.tagline}. Developed by {HUMAN_CENTRIC_WORKS.legalName}.
            </p>
          </Column>
          <Column sm={4} md={4} lg={6}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
              Company
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }} aria-label="Company">
              <Link href="/login" className="cds--link">
                Sign in
              </Link>
              <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
                {HUMAN_CENTRIC_WORKS.email}
              </a>
            </nav>
          </Column>
          <Column sm={4} md={8} lg={4}>
            <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}
            </p>
          </Column>
        </Grid>
      </footer>
    </div>
  );
}
