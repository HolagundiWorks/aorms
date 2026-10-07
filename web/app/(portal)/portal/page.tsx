import Link from "next/link";
import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { placeholderFor } from "../../../lib/projects/placeholder";
import { signCoverUrls } from "../../../lib/projects/covers";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { BigStat } from "../../../components/aorms/BigStat";

const STATUS_LABEL: Record<string, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL: "Proposal",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

/**
 * Client Portal home — the Office Hub's Projects page, scoped to the client: three figures, then the same
 * image gallery (the name shows over the image on hover or focus; nothing printed under it). RLS limits every
 * query to this client's own projects.
 */
export default async function PortalHomePage() {
  const supabase = await createClient();

  const [{ data: projects, error }, { count: awaiting }, { count: unpaid }] = await Promise.all([
    supabase.from("project_offices").select("id, ref, title, status, project_type, city, cover_image_key").order("created_at", { ascending: false }),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "SENT"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "ISSUED"),
  ]);

  const rows = projects ?? [];
  // Signed cover URLs, minted only for the keys the RLS-scoped read above returned; a project without one gets a placeholder.
  const covers = await signCoverUrls(rows.map((p) => p.cover_image_key));
  const active = rows.filter((p) => p.status === "ACTIVE").length;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Your projects"
          result="Your project, in plain view."
          description="Published progress, invoices, drawings and documents for your projects with us."
        />

        <div className="aorms-bigstat-row">
          <BigStat value={rows.length} label="Projects" />
          <BigStat value={active} label="Active" active />
          <BigStat value={awaiting ?? 0} label="Awaiting your response" />
          <BigStat value={unpaid ?? 0} label="Invoices to pay" />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load your projects: {error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            No projects yet.
          </p>
        ) : (
          <div className="aorms-pcard-grid">
            {rows.map((p) => {
              const status = STATUS_LABEL[p.status] ?? p.status;
              return (
                <div className="aorms-pcard" key={p.id}>
                  <Link href={`/portal/${p.id}`} className="aorms-pcard__link" aria-label={`${p.title}, ${p.ref}, ${status}`}>
                    <div className="aorms-pcard__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(p.cover_image_key && covers.get(p.cover_image_key)) || placeholderFor(p.ref)} alt="" loading="lazy" />
                      <div className="aorms-pcard__veil" aria-hidden>
                        <span className="aorms-pcard__name">{p.title}</span>
                        <span className="aorms-pcard__meta">{[p.ref, status].join(" · ")}</span>
                        <span className="aorms-pcard__meta">{[p.project_type, p.city].filter(Boolean).join(" · ")}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Column>
    </Grid>
  );
}
