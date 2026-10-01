import Link from "next/link";
import { PlanGlyph } from "./PlanGlyph";

export type ProjectCardData = {
  id: string;
  ref: string;
  title: string;
  status: string;
  clientName: string | null;
  city: string | null;
  builtUpSqm: number | null;
  siteSqm: number | null;
  floors: number | null;
  tasksDone: number;
  tasksTotal: number;
};

const STATUS_LABEL: Record<string, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL: "Proposal",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

/** Project board card: generated plan drawing, ref, title, lifecycle status, task progress. */
export function ProjectCard({ p }: { p: ProjectCardData }) {
  const pct = p.tasksTotal ? Math.round((p.tasksDone / p.tasksTotal) * 100) : null;
  return (
    <Link href={`/projects/${p.id}`} className="aorms-project-card">
      <div className="aorms-project-card__plan">
        <PlanGlyph seed={p.ref} builtUpSqm={p.builtUpSqm} siteSqm={p.siteSqm} floors={p.floors} />
      </div>
      <div>
        <div className="aorms-project-card__ref">{p.ref}</div>
        <div className="cds--type-heading-compact-02" style={{ marginBlock: "0.125rem" }}>{p.title}</div>
        <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
          {[p.clientName, p.city].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <div className="aorms-project-card__phase" style={{ color: p.status === "ACTIVE" ? "var(--aorms-orange-text)" : undefined }}>
        {STATUS_LABEL[p.status] ?? p.status}
      </div>
      <div className="aorms-progress-line" title={pct === null ? "No tasks yet" : `${p.tasksDone} of ${p.tasksTotal} tasks done`}>
        <div className="aorms-progress-line__track">
          <div className="aorms-progress-line__fill" style={{ inlineSize: `${pct ?? 0}%` }} />
        </div>
        <span>{pct === null ? "—" : `${pct}%`}</span>
      </div>
    </Link>
  );
}
