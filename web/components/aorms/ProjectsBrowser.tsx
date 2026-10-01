"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Pin, PinFilled } from "@carbon/icons-react";
import { PlanGlyph } from "./PlanGlyph";
import { ListToolbar } from "./ListToolbar";
import { MotionRoot } from "./motion/MotionRoot";
import { MotionStagger } from "./motion/MotionStagger";
import { setProjectPinned } from "../../lib/actions/project-covers";

export type BrowserProject = {
  id: string;
  ref: string;
  title: string;
  status: string;
  clientName: string | null;
  city: string | null;
  projectType: string;
  builtUpSqm: number | null;
  siteSqm: number | null;
  floors: number | null;
  tasksDone: number;
  tasksTotal: number;
  coverUrl: string | null;
  pinned: boolean;
};

export type ProjectsView = "cards" | "lines";
export const VIEW_COOKIE = "aorms_projects_view";

const STATUS_LABEL: Record<string, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL: "Proposal",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};
const STATUS_TAG: Record<string, "green" | "blue" | "gray" | "purple" | "teal"> = {
  ENQUIRY: "gray",
  PROPOSAL: "purple",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "teal",
  ARCHIVED: "gray",
};

/**
 * Projects as image cards (hover reveals the project name) or as a compact
 * schedule of lines, with personal pins floating to the top of either view.
 * The chosen view is remembered in a cookie the server page reads on the next
 * visit, so the page renders in the right layout with no flash. Pinning is
 * optimistic and reverts (with a message) if the server refuses.
 */
export function ProjectsBrowser({ projects, initialView }: { projects: BrowserProject[]; initialView: ProjectsView }) {
  const [view, setView] = useState<ProjectsView>(initialView);
  const [pinned, setPinned] = useState<Set<string>>(() => new Set(projects.filter((p) => p.pinned).map((p) => p.id)));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "name" | "ref" | "status" | "progress">("newest");

  const changeView = (v: ProjectsView) => {
    setView(v);
    try {
      document.cookie = `${VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked — the view still switches for this visit */
    }
  };

  const togglePin = (id: string) => {
    const next = !pinned.has(id);
    setError(null);
    setPinned((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    startTransition(async () => {
      const res = await setProjectPinned(id, next);
      if (res.error) {
        setError(res.error);
        setPinned((prev) => {
          const s = new Set(prev);
          if (next) s.delete(id);
          else s.add(id);
          return s;
        });
      }
    });
  };

  const typeOptions = useMemo(() => [...new Set(projects.map((p) => p.projectType).filter(Boolean))].sort(), [projects]);
  const statusOptions = useMemo(() => [...new Set(projects.map((p) => p.status))], [projects]);
  const progress = (p: BrowserProject) => (p.tasksTotal ? p.tasksDone / p.tasksTotal : -1);

  // Filter, then sort (the server order is newest-first), then float pinned to the
  // top — Array.sort is stable, so each group keeps the chosen order.
  const ordered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = projects.filter(
      (p) =>
        (!statusFilter || p.status === statusFilter) &&
        (!typeFilter || p.projectType === typeFilter) &&
        (!needle || `${p.title} ${p.ref} ${p.clientName ?? ""} ${p.city ?? ""} ${p.projectType}`.toLowerCase().includes(needle)),
    );
    const by: Record<typeof sort, (a: BrowserProject, b: BrowserProject) => number> = {
      newest: () => 0,
      name: (a, b) => a.title.localeCompare(b.title),
      ref: (a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }),
      status: (a, b) => a.status.localeCompare(b.status) || a.title.localeCompare(b.title),
      progress: (a, b) => progress(b) - progress(a),
    };
    return [...list].sort(by[sort]).sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
  }, [projects, pinned, q, statusFilter, typeFilter, sort]);
  const pinnedList = ordered.filter((p) => pinned.has(p.id));
  const restList = ordered.filter((p) => !pinned.has(p.id));
  const filtering = q !== "" || statusFilter !== "" || typeFilter !== "" || sort !== "newest";

  const pinButton = (p: BrowserProject, className: string) => (
    <button
      type="button"
      className={className}
      aria-pressed={pinned.has(p.id)}
      aria-label={pinned.has(p.id) ? `Unpin ${p.title}` : `Pin ${p.title} to the top`}
      title={pinned.has(p.id) ? "Unpin" : "Pin to top"}
      onClick={() => togglePin(p.id)}
    >
      {pinned.has(p.id) ? <PinFilled size={16} /> : <Pin size={16} />}
    </button>
  );

  const card = (p: BrowserProject) => {
    const pct = p.tasksTotal ? Math.round((p.tasksDone / p.tasksTotal) * 100) : null;
    return (
      <div className="aorms-pcard" key={p.id}>
        <Link href={`/projects/${p.id}`} className="aorms-pcard__link">
          <div className="aorms-pcard__media">
            {p.coverUrl ? (
              // Plain <img>: a short-lived signed Supabase URL, not a next/image source.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverUrl} alt="" loading="lazy" />
            ) : (
              <div className="aorms-pcard__plan">
                <PlanGlyph seed={p.ref} builtUpSqm={p.builtUpSqm} siteSqm={p.siteSqm} floors={p.floors} height={110} />
              </div>
            )}
            <div className="aorms-pcard__veil">
              <span className="aorms-pcard__name">{p.title}</span>
              <span className="aorms-pcard__meta">
                {[p.clientName, p.city].filter(Boolean).join(" · ") || p.projectType}
                {pct !== null ? ` · ${pct}% of tasks done` : ""}
              </span>
            </div>
          </div>
          <div className="aorms-pcard__cap">
            <span className="aorms-project-card__ref">{p.ref}</span>
            <span className="aorms-project-card__phase" style={{ color: p.status === "ACTIVE" ? "var(--aorms-orange-text)" : undefined }}>
              {STATUS_LABEL[p.status] ?? p.status}
            </span>
          </div>
        </Link>
        {pinButton(p, `aorms-pin aorms-pin--card${pinned.has(p.id) ? " is-pinned" : ""}`)}
      </div>
    );
  };

  const grid = (list: BrowserProject[]) => (
    <MotionRoot>
      <MotionStagger className="aorms-pcard-grid">{list.map(card)}</MotionStagger>
    </MotionRoot>
  );

  return (
    <div>
      <ListToolbar
        label="Search, filter and sort projects"
        search={{ value: q, onChange: setQ, placeholder: "Search projects, refs, clients, cities" }}
        filters={[
          { id: "pf-status", label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "All statuses" }, ...statusOptions.map((v) => ({ value: v, label: STATUS_LABEL[v] ?? v }))] },
          { id: "pf-type", label: "Type", value: typeFilter, onChange: setTypeFilter, options: [{ value: "", label: "All types" }, ...typeOptions.map((v) => ({ value: v, label: v }))] },
        ]}
        sort={{
          id: "pf-sort",
          label: "Sort by",
          value: sort,
          onChange: (v) => setSort(v as typeof sort),
          options: [
            { value: "newest", label: "Newest first" },
            { value: "name", label: "Name A–Z" },
            { value: "ref", label: "Reference" },
            { value: "status", label: "Status" },
            { value: "progress", label: "Task progress" },
          ],
        }}
        view={{
          value: view,
          options: [
            { value: "cards", label: "Cards" },
            { value: "lines", label: "Lines" },
          ],
          onChange: (v) => changeView(v as ProjectsView),
        }}
        status={`Showing ${ordered.length} of ${projects.length} project${projects.length === 1 ? "" : "s"}${pinned.size > 0 ? ` · ${pinned.size} pinned (kept on top)` : ""}`}
        actions={
          filtering ? (
            <button
              type="button"
              className="cds--btn cds--btn--ghost cds--btn--sm"
              onClick={() => {
                setQ("");
                setStatusFilter("");
                setTypeFilter("");
                setSort("newest");
              }}
            >
              Reset
            </button>
          ) : undefined
        }
      />

      {error && (
        <div style={{ marginBlockEnd: "1rem" }}>
          <InlineNotification kind="error" title="Couldn't update pin" subtitle={error} lowContrast onCloseButtonClick={() => setError(null)} />
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          {projects.length === 0 ? "No projects yet." : "No projects match the search and filters."}
        </p>
      ) : view === "cards" ? (
        <>
          {pinnedList.length > 0 && (
            <section aria-label="Pinned projects" style={{ marginBottom: "2rem" }}>
              <h2 className="aorms-bigstat__label aorms-pbrowser__heading">Pinned</h2>
              {grid(pinnedList)}
            </section>
          )}
          <section aria-label="Projects">
            {pinnedList.length > 0 && restList.length > 0 && <h2 className="aorms-bigstat__label aorms-pbrowser__heading">All projects</h2>}
            {restList.length > 0 && grid(restList)}
          </section>
        </>
      ) : (
        <Table aria-label="Projects">
          <TableHead>
            <TableRow>
              <TableHeader aria-label="Pin" style={{ width: "2.5rem" }} />
              <TableHeader>Ref</TableHeader>
              <TableHeader>Project</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>City</TableHeader>
              <TableHeader>Tasks</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map((p) => (
              <TableRow key={p.id}>
                <TableCell style={{ paddingInline: "0.5rem" }}>{pinButton(p, `aorms-pin${pinned.has(p.id) ? " is-pinned" : ""}`)}</TableCell>
                <TableCell>
                  <span className="aorms-project-card__ref">{p.ref}</span>
                </TableCell>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="aorms-pline__title">
                    <span className="aorms-pline__thumb" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.coverUrl ? <img src={p.coverUrl} alt="" loading="lazy" /> : null}
                    </span>
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell>{p.clientName ?? "—"}</TableCell>
                <TableCell>{p.projectType}</TableCell>
                <TableCell>{p.city ?? "—"}</TableCell>
                <TableCell className="aorms-num">{p.tasksTotal ? `${p.tasksDone}/${p.tasksTotal}` : "—"}</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[p.status] ?? "gray"} size="sm">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Tag>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
