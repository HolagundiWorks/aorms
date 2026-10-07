import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { BigStat } from "../../../components/aorms/BigStat";
import { placeholderFor } from "../../../lib/projects/placeholder";
import { signCoverUrls } from "../../../lib/projects/covers";

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function CollabPortalHomePage() {
  const supabase = await createClient();

  const { data: engagements, error } = await supabase
    .from("engagements")
    .select("id, scope, agreed_fee_paise, paid_paise, status, project_offices(id, ref, title, status, cover_image_key)")
    .order("created_at", { ascending: false });

  type GalleryProject = { id: string; ref: string; title: string; cover_image_key: string | null };
  const galleryRows = (engagements ?? []).flatMap((e) => {
    const project = (Array.isArray(e.project_offices) ? e.project_offices[0] : e.project_offices) as GalleryProject | null | undefined;
    return project ? [{ e, project }] : [];
  });
  // Signed cover URLs, minted only for keys the RLS-scoped read above returned; a project without one gets a placeholder.
  const covers = await signCoverUrls(galleryRows.map((r) => r.project.cover_image_key));

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Your engagements" result="Information shared without chasing."
          description="Projects you're engaged on, agreed fee, and payments received."
        />

        <div className="aorms-bigstat-row">
          <BigStat value={(engagements ?? []).length} label="Engagements" />
          <BigStat value={(engagements ?? []).filter((e) => e.status === "ACTIVE").length} label="Active" active />
          <BigStat value={formatInr((engagements ?? []).reduce((n, e) => n + (e.agreed_fee_paise ?? 0), 0))} label="Agreed fee" />
          <BigStat value={formatInr((engagements ?? []).reduce((n, e) => n + (e.paid_paise ?? 0), 0))} label="Paid to date" />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load your engagements: {error.message}
          </p>
        ) : (
          <>
          {galleryRows.length > 0 && (
            <div className="aorms-pcard-grid" style={{ marginBottom: "2rem" }}>
              {galleryRows.map(({ e, project }) => (
                <div className="aorms-pcard" key={e.id}>
                  <Link href={`/collab-portal/${project.id}`} className="aorms-pcard__link" aria-label={`${project.title}, ${project.ref}, ${e.status}`}>
                    <div className="aorms-pcard__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(project.cover_image_key && covers.get(project.cover_image_key)) || placeholderFor(project.ref)} alt="" loading="lazy" />
                      <div className="aorms-pcard__veil" aria-hidden>
                        <span className="aorms-pcard__name">{project.title}</span>
                        <span className="aorms-pcard__meta">{[project.ref, e.status].join(" · ")}</span>
                        {e.scope && <span className="aorms-pcard__meta">{e.scope}</span>}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <Table aria-label="Your engagements" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Scope</TableHeader>
                <TableHeader>Agreed fee</TableHeader>
                <TableHeader>Paid</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(engagements ?? []).map((e) => {
                const project = Array.isArray(e.project_offices)
                  ? e.project_offices[0]
                  : (e.project_offices as { id: string; ref: string; title: string } | null);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      {project ? <Link href={`/collab-portal/${project.id}`}>{project.title}</Link> : "—"}
                    </TableCell>
                    <TableCell>{e.scope ?? "—"}</TableCell>
                    <TableCell>{formatInr(e.agreed_fee_paise)}</TableCell>
                    <TableCell>{formatInr(e.paid_paise)}</TableCell>
                    <TableCell>
                      <Tag type="blue" size="sm">
                        {e.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(engagements ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No engagements yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </>
        )}
      </Column>
    </Grid>
  );
}
