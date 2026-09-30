"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Checkbox, InlineNotification, Select, SelectItem, Tag, TextInput } from "@carbon/react";
import { generateProjectTasks } from "../../../lib/actions/task-library";
import { planTasks, scaleBand, type TaskTemplate } from "../../../lib/tasks/estimate";
import { HOURS_PER_DAY } from "../../../lib/tasks/dates";

export type ProjectScaleRow = {
  id: string;
  title: string;
  built_up_area_sqm: number | null;
  site_area_sqm: number | null;
  floor_count: number | null;
};
type Assignee = { id: string; full_name: string | null };

const FLOOR_NAMES = ["Ground floor", "First floor", "Second floor", "Third floor", "Fourth floor", "Fifth floor"];
const floorName = (i: number) => FLOOR_NAMES[i] ?? `Floor ${i}`;

function splitFloors(builtUp: number, count: number) {
  const each = count > 0 && builtUp > 0 ? Math.round((builtUp / count) * 10) / 10 : 0;
  return Array.from({ length: count }, (_, i) => ({ label: floorName(i), areaSqm: each }));
}

export function GenerateTasksPanel({
  templates,
  projects,
  assignees,
  today,
}: {
  templates: TaskTemplate[];
  projects: ProjectScaleRow[];
  assignees: Assignee[];
  today: string;
}) {
  const active = templates.filter((t) => t.active !== false);
  const [projectId, setProjectId] = useState("");
  const [builtUp, setBuiltUp] = useState("");
  const [site, setSite] = useState("");
  const [floors, setFloors] = useState<{ label: string; areaSqm: number }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(active.map((t) => t.id)));
  const [start, setStart] = useState(today);
  const [complexity, setComplexity] = useState("1");
  const [assigneeId, setAssigneeId] = useState("");
  const [saveScale, setSaveScale] = useState(true);
  const [result, setResult] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const builtUpNum = Number(builtUp) || 0;
  const siteNum = Number(site) || 0;
  const complexityNum = Number(complexity) || 1;

  const onProject = (id: string) => {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    const b = p?.built_up_area_sqm ?? 0;
    setBuiltUp(b ? String(b) : "");
    setSite(p?.site_area_sqm ? String(p.site_area_sqm) : "");
    setFloors(splitFloors(b, p?.floor_count ?? (b ? 1 : 0)));
  };

  const planned = useMemo(
    () =>
      planTasks(
        active.filter((t) => selected.has(t.id)),
        { builtUpAreaSqm: builtUpNum, siteAreaSqm: siteNum, floors: floors.filter((f) => f.areaSqm > 0) },
        start,
        complexityNum,
      ),
    [active, selected, builtUpNum, siteNum, floors, start, complexityNum],
  );
  const totalHours = planned.reduce((s, p) => s + p.estimatedHours, 0);
  const needsFloors = active.some((t) => selected.has(t.id) && t.scope === "PER_FLOOR") && floors.every((f) => f.areaSqm <= 0);

  const bundles = useMemo(() => {
    const m = new Map<string, TaskTemplate[]>();
    for (const t of active) m.set(t.bundle, [...(m.get(t.bundle) ?? []), t]);
    return [...m.entries()];
  }, [active]);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) (on ? next.add(id) : next.delete(id));
      return next;
    });

  const submit = () => {
    setResult(null);
    startTransition(async () => {
      const res = await generateProjectTasks({
        projectId,
        templateIds: [...selected],
        startDate: start,
        complexity: complexityNum,
        builtUpAreaSqm: builtUpNum,
        siteAreaSqm: siteNum,
        floors,
        assigneeId: assigneeId || null,
        saveScaleToProject: saveScale,
      });
      setResult(res.error ? { kind: "error", text: res.error } : { kind: "success", text: `Created ${res.created} tasks — review them on the Tasks board.` });
    });
  };

  if (active.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Select id="gen-project" labelText="Project" value={projectId} onChange={(e) => onProject(e.target.value)}>
        <SelectItem value="" text="Choose a project…" />
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id} text={p.title} />
        ))}
      </Select>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "1rem" }}>
        <TextInput id="gen-builtup" type="number" min={0} labelText="Built-up area (m²)" value={builtUp}
          onChange={(e) => { setBuiltUp(e.target.value); setFloors((f) => (f.length ? splitFloors(Number(e.target.value) || 0, f.length) : f)); }}
          helperText={builtUpNum ? `Scale: ${scaleBand(builtUpNum)}` : "Drives project-wide durations"} />
        <TextInput id="gen-site" type="number" min={0} labelText="Site area (m²)" value={site} onChange={(e) => setSite(e.target.value)} />
        <TextInput id="gen-floors" type="number" min={0} max={60} labelText="Number of floors" value={String(floors.length)}
          onChange={(e) => setFloors(splitFloors(builtUpNum, Math.max(0, Math.min(60, Number(e.target.value) || 0))))}
          helperText="Floor area defaults to an even split" />
        <TextInput id="gen-start" type="date" labelText="Start date" value={start} onChange={(e) => setStart(e.target.value)} />
        <TextInput id="gen-complexity" type="number" step="0.1" min={0.5} max={2} labelText="Complexity factor"
          value={complexity} onChange={(e) => setComplexity(e.target.value)} helperText="1 = typical · 1.3 = intricate · 0.8 = repeat design" />
        <Select id="gen-assignee" labelText="Assign all to (optional)" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <SelectItem value="" text="Unassigned" />
          {assignees.map((a) => (
            <SelectItem key={a.id} value={a.id} text={a.full_name ?? "Unnamed"} />
          ))}
        </Select>
      </div>

      {floors.length > 0 && (
        <div>
          <p className="cds--type-label-01" style={{ marginBottom: "0.5rem" }}>Floor areas (m²) — each floor&apos;s working drawings are sized from its own area</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "0.75rem" }}>
            {floors.map((f, i) => (
              <div key={i} style={{ display: "grid", gap: "0.25rem" }}>
                <TextInput id={`gen-floor-name-${i}`} size="sm" labelText="Name" hideLabel value={f.label}
                  onChange={(e) => setFloors((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <TextInput id={`gen-floor-area-${i}`} size="sm" type="number" min={0} labelText={`${f.label} area`} hideLabel value={String(f.areaSqm || "")}
                  onChange={(e) => setFloors((prev) => prev.map((x, j) => (j === i ? { ...x, areaSqm: Number(e.target.value) || 0 } : x)))} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="cds--type-label-01" style={{ marginBottom: "0.5rem" }}>Library entries to bundle into the project</p>
        {bundles.map(([bundle, items]) => (
          <fieldset key={bundle} style={{ border: 0, padding: 0, margin: "0 0 0.75rem" }}>
            <Checkbox id={`bundle-${bundle}`} labelText={<strong>{bundle}</strong>}
              checked={items.every((t) => selected.has(t.id))}
              onChange={(_, { checked }) => toggle(items.map((t) => t.id), checked)} />
            <div style={{ marginLeft: "1.5rem" }}>
              {items.map((t) => (
                <Checkbox key={t.id} id={`tpl-${t.id}`} labelText={`${t.title}${t.scope === "PER_FLOOR" ? " (per floor)" : ""}`}
                  checked={selected.has(t.id)} onChange={(_, { checked }) => toggle([t.id], checked)} />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div style={{ background: "var(--cds-layer-01)", padding: "0.75rem" }}>
        <p className="cds--type-heading-compact-01" style={{ marginBottom: "0.5rem" }}>
          Preview · {planned.length} tasks · {Math.round(totalHours)}h ({Math.round((totalHours / HOURS_PER_DAY) * 10) / 10} person-days)
        </p>
        {needsFloors && (
          <InlineNotification kind="warning" lowContrast hideCloseButton title="Add floors" subtitle="Per-floor entries are selected but no floor has an area yet." />
        )}
        <div style={{ maxHeight: "18rem", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} className="cds--type-body-compact-01">
            <tbody>
              {planned.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                  <td style={{ padding: "0.25rem 0.5rem 0.25rem 0" }}>{p.title}</td>
                  <td style={{ padding: "0.25rem" }}>{p.areaSqm ? `${p.areaSqm} m²` : "—"}</td>
                  <td style={{ padding: "0.25rem" }}><Tag size="sm" type="gray">{p.estimatedHours}h</Tag></td>
                  <td style={{ padding: "0.25rem" }}>{p.startDate} → {p.dueDate}</td>
                  <td style={{ padding: "0.25rem", color: "var(--cds-text-secondary)" }}>{p.dependsOnTitle ? `after ${p.dependsOnTitle}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Checkbox id="gen-save-scale" labelText="Save these areas and floor count to the project" checked={saveScale} onChange={(_, { checked }) => setSaveScale(checked)} />

      {result && <InlineNotification kind={result.kind} lowContrast hideCloseButton title={result.kind === "error" ? "Couldn't generate" : "Done"} subtitle={result.text} />}
      <div>
        <Button onClick={submit} disabled={pending || !projectId || planned.length === 0}>
          {pending ? "Generating…" : `Generate ${planned.length} tasks`}
        </Button>
      </div>
    </div>
  );
}
