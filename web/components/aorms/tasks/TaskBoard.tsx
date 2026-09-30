"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  ContentSwitcher,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  ProgressBar,
  Switch,
  Tag,
} from "@carbon/react";
import { ChevronLeft, ChevronRight, UserAvatar } from "@carbon/icons-react";
import { assignTask, setTaskDueDate, updateTaskStatus } from "../../../lib/actions/tasks";
import { addDays } from "../../../lib/tasks/dates";
import { analyzeAssignee, isOpen, taskAlerts, type TaskAlert } from "../../../lib/tasks/workload";

export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  assignee_id: string | null;
  project_title: string | null;
  floor_label: string | null;
};
export type Person = { id: string; name: string };

type Column = { key: "TODO" | "IN_PROGRESS" | "DONE"; label: string; statuses: string[] };
const COLUMNS: Column[] = [
  { key: "TODO", label: "To do", statuses: ["TODO"] },
  { key: "IN_PROGRESS", label: "In progress", statuses: ["IN_PROGRESS", "BLOCKED"] },
  { key: "DONE", label: "Completed", statuses: ["DONE"] },
];

const ALERT_LABEL: Record<TaskAlert, string> = {
  OVERDUE: "Overdue",
  SHORT_DEADLINE: "Short deadline",
  AT_RISK: "At risk",
};
const ALERT_TAG: Record<TaskAlert, "red" | "magenta" | "purple"> = {
  OVERDUE: "red",
  SHORT_DEADLINE: "magenta",
  AT_RISK: "purple",
};

type Drag = { kind: "task"; id: string } | { kind: "person"; id: string | null };
const MIME = "application/x-aorms-task-drag";

const startDrag = (e: React.DragEvent, payload: Drag) => {
  e.dataTransfer.setData(MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
};
const readDrag = (e: React.DragEvent): Drag | null => {
  try {
    return JSON.parse(e.dataTransfer.getData(MIME)) as Drag;
  } catch {
    return null;
  }
};
const allowDrop = (e: React.DragEvent) => {
  if (e.dataTransfer.types.includes(MIME)) e.preventDefault();
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function TaskBoard({
  initialTasks,
  people,
  canWrite,
  today,
}: {
  initialTasks: BoardTask[];
  people: Person[];
  canWrite: boolean;
  today: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [notice, setNotice] = useState<{ kind: "error" | "warning"; text: string } | null>(null);
  const [overPerson, setOverPerson] = useState<string | null>(null);
  const [overTask, setOverTask] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);

  const personName = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const alerts = useMemo(() => taskAlerts(tasks, today), [tasks, today]);
  const loads = useMemo(
    () =>
      new Map(
        people.map((p) => [p.id, analyzeAssignee(tasks.filter((t) => t.assignee_id === p.id), today)] as const),
      ),
    [tasks, people, today],
  );

  const patch = useCallback((id: string, fields: Partial<BoardTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  }, []);

  // Optimistic update; reverts (and says why) if the server refuses.
  const mutate = useCallback(
    async (id: string, fields: Partial<BoardTask>, run: () => Promise<{ error?: string }>) => {
      const before = tasks.find((t) => t.id === id);
      if (!before) return;
      const revert: Partial<BoardTask> = {};
      for (const k of Object.keys(fields) as (keyof BoardTask)[]) (revert as Record<string, unknown>)[k] = before[k];
      patch(id, fields);
      setNotice(null);
      const res = await run();
      if (res.error) {
        patch(id, revert);
        setNotice({ kind: "error", text: res.error });
      }
    },
    [tasks, patch],
  );

  const moveToColumn = (id: string, col: Column) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || col.statuses.includes(t.status)) return;
    void mutate(id, { status: col.key }, () => updateTaskStatus(id, col.key));
  };

  const assign = (taskId: string, personId: string | null) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t || t.assignee_id === personId) return;
    // Warn when this assignment tips the person over capacity.
    if (personId && isOpen(t)) {
      const next = tasks.map((x) => (x.id === taskId ? { ...x, assignee_id: personId } : x));
      const after = analyzeAssignee(next.filter((x) => x.assignee_id === personId), today);
      if (after.overloaded && !loads.get(personId)?.overloaded) {
        setNotice({
          kind: "warning",
          text: `${personName.get(personId)} is now over capacity — about ${Math.ceil(after.shortfallHours)}h more than they can deliver by ${fmtDate(after.breakDate!)}. Consider moving a deadline or another assignee.`,
        });
      }
    }
    void mutate(taskId, { assignee_id: personId }, () => assignTask(taskId, personId));
  };

  const setDue = (taskId: string, iso: string | null) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t || t.due_date === iso) return;
    void mutate(taskId, { due_date: iso }, () => setTaskDueDate(taskId, iso));
  };

  const overloadedPeople = people.filter((p) => loads.get(p.id)?.overloaded);
  const shortCount = [...alerts.values()].filter((a) => a === "SHORT_DEADLINE").length;
  const overdueCount = [...alerts.values()].filter((a) => a === "OVERDUE").length;

  return (
    <div>
      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }} aria-live="polite">
        {notice && (
          <InlineNotification
            kind={notice.kind}
            title={notice.kind === "error" ? "Couldn't save" : "Workload warning"}
            subtitle={notice.text}
            onCloseButtonClick={() => setNotice(null)}
            lowContrast
          />
        )}
        {overloadedPeople.map((p) => {
          const l = loads.get(p.id)!;
          return (
            <InlineNotification
              key={p.id}
              kind="warning"
              hideCloseButton
              lowContrast
              title={`${p.name} is overloaded`}
              subtitle={`${Math.ceil(l.shortfallHours)}h more work than they can finish by ${fmtDate(l.breakDate!)} (${Math.round(l.openHours)}h open in total). Reassign or extend a deadline.`}
            />
          );
        })}
        {(shortCount > 0 || overdueCount > 0) && (
          <InlineNotification
            kind={overdueCount ? "error" : "warning"}
            hideCloseButton
            lowContrast
            title="Deadlines need attention"
            subtitle={[
              overdueCount ? `${overdueCount} overdue` : null,
              shortCount ? `${shortCount} due within 2 working days` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </div>

      <div style={{ maxWidth: "20rem", marginBottom: "1rem" }}>
        <ContentSwitcher size="md" selectedIndex={view === "board" ? 0 : 1} onChange={(e) => setView(e.name as "board" | "calendar")}>
          <Switch name="board" text="Board" />
          <Switch name="calendar" text="Calendar" />
        </ContentSwitcher>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 16rem", gap: "1rem", alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {view === "board" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem" }}>
              {COLUMNS.map((col) => {
                const items = tasks.filter((t) => col.statuses.includes(t.status));
                return (
                  <section
                    key={col.key}
                    aria-label={col.label}
                    onDragOver={(e) => {
                      allowDrop(e);
                      setOverColumn(col.key);
                    }}
                    onDragLeave={() => setOverColumn((c) => (c === col.key ? null : c))}
                    onDrop={(e) => {
                      setOverColumn(null);
                      const d = readDrag(e);
                      if (d?.kind === "task" && canWrite) moveToColumn(d.id, col);
                    }}
                    style={{
                      background: overColumn === col.key ? "var(--cds-layer-hover-01)" : "var(--cds-layer-01)",
                      outline: overColumn === col.key ? "2px dashed var(--cds-focus)" : "none",
                      minHeight: "24rem",
                      padding: "0.75rem",
                    }}
                  >
                    <h3 className="cds--type-heading-compact-01" style={{ marginBottom: "0.75rem" }}>
                      {col.label} <Tag size="sm" type="gray">{items.length}</Tag>
                    </h3>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {items.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          alert={t.status === "DONE" ? undefined : alerts.get(t.id)}
                          assigneeName={t.assignee_id ? personName.get(t.assignee_id) ?? "Unknown" : null}
                          canWrite={canWrite}
                          dropActive={overTask === t.id}
                          onDragOverCard={(on) => setOverTask(on ? t.id : null)}
                          onAssignDrop={(personId) => assign(t.id, personId)}
                          onMove={(c) => moveToColumn(t.id, c)}
                        />
                      ))}
                      {items.length === 0 && (
                        <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                          {canWrite ? "Drop a task here." : "Nothing here."}
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <CalendarView
              tasks={tasks}
              alerts={alerts}
              today={today}
              canWrite={canWrite}
              overDay={overDay}
              setOverDay={setOverDay}
              onDrop={setDue}
            />
          )}
        </div>

        <aside aria-label="Team" style={{ background: "var(--cds-layer-01)", padding: "0.75rem" }}>
          <h3 className="cds--type-heading-compact-01" style={{ marginBottom: "0.25rem" }}>Team</h3>
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
            {canWrite ? "Drag a person onto a task to assign it." : "Team workload."}
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {people.map((p) => {
              const l = loads.get(p.id)!;
              return (
                <div
                  key={p.id}
                  draggable={canWrite}
                  onDragStart={(e) => startDrag(e, { kind: "person", id: p.id })}
                  onDragOver={(e) => {
                    allowDrop(e);
                    setOverPerson(p.id);
                  }}
                  onDragLeave={() => setOverPerson((c) => (c === p.id ? null : c))}
                  onDrop={(e) => {
                    setOverPerson(null);
                    const d = readDrag(e);
                    if (d?.kind === "task" && canWrite) assign(d.id, p.id);
                  }}
                  style={{
                    background: overPerson === p.id ? "var(--cds-layer-hover-02)" : "var(--cds-layer-02)",
                    padding: "0.5rem",
                    cursor: canWrite ? "grab" : "default",
                    borderLeft: `3px solid ${l.overloaded ? "var(--cds-support-error)" : "transparent"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      aria-hidden
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: "var(--cds-background-inverse)",
                        color: "var(--cds-text-inverse)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.75rem",
                        flex: "none",
                      }}
                    >
                      {initials(p.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cds--type-body-compact-01" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </div>
                      <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {l.openCount} open · {Math.round(l.openHours)}h
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <ProgressBar
                      label={`${p.name} load`}
                      hideLabel
                      size="small"
                      value={Math.min(100, Math.round(l.utilisation * 100))}
                      max={100}
                      status={l.overloaded ? "error" : "active"}
                      helperText={l.overloaded ? "Overloaded" : `${Math.round(l.utilisation * 100)}% of next 2 weeks`}
                    />
                  </div>
                </div>
              );
            })}
            {people.length === 0 && <p className="cds--type-helper-text-01">No team members yet.</p>}
            {canWrite && (
              <div
                onDragOver={allowDrop}
                onDrop={(e) => {
                  const d = readDrag(e);
                  if (d?.kind === "task") assign(d.id, null);
                }}
                className="cds--type-helper-text-01"
                style={{ border: "1px dashed var(--cds-border-strong-01)", padding: "0.5rem", color: "var(--cds-text-secondary)" }}
              >
                <UserAvatar size={16} style={{ verticalAlign: "text-bottom" }} /> Drop a task here to unassign
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  alert,
  assigneeName,
  canWrite,
  dropActive,
  onDragOverCard,
  onAssignDrop,
  onMove,
}: {
  task: BoardTask;
  alert?: TaskAlert;
  assigneeName: string | null;
  canWrite: boolean;
  dropActive: boolean;
  onDragOverCard: (on: boolean) => void;
  onAssignDrop: (personId: string | null) => void;
  onMove: (col: Column) => void;
}) {
  return (
    <div
      draggable={canWrite}
      onDragStart={(e) => startDrag(e, { kind: "task", id: task.id })}
      onDragOver={(e) => {
        allowDrop(e);
        onDragOverCard(true);
      }}
      onDragLeave={() => onDragOverCard(false)}
      onDrop={(e) => {
        onDragOverCard(false);
        const d = readDrag(e);
        if (d?.kind === "person" && canWrite) {
          e.stopPropagation();
          onAssignDrop(d.id);
        }
      }}
      style={{
        background: dropActive ? "var(--cds-layer-hover-02)" : "var(--cds-layer-02)",
        outline: dropActive ? "2px solid var(--cds-focus)" : "none",
        padding: "0.75rem",
        cursor: canWrite ? "grab" : "default",
        borderLeft: `3px solid ${alert ? "var(--cds-support-error)" : "transparent"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <span className="cds--type-body-compact-01" style={{ fontWeight: 600 }}>{task.title}</span>
        {canWrite && (
          <OverflowMenu size="sm" flipped aria-label={`Move ${task.title}`}>
            {COLUMNS.map((c) => (
              <OverflowMenuItem key={c.key} itemText={`Move to ${c.label}`} disabled={c.statuses.includes(task.status)} onClick={() => onMove(c)} />
            ))}
          </OverflowMenu>
        )}
      </div>
      {(task.project_title || task.floor_label) && (
        <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
          {[task.project_title, task.floor_label].filter(Boolean).join(" · ")}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
        {task.status === "BLOCKED" && <Tag size="sm" type="red">Blocked</Tag>}
        {alert && <Tag size="sm" type={ALERT_TAG[alert]}>{ALERT_LABEL[alert]}</Tag>}
        {task.due_date && <Tag size="sm" type="outline">Due {fmtDate(task.due_date)}</Tag>}
        {task.estimated_hours != null && <Tag size="sm" type="gray">{task.estimated_hours}h</Tag>}
        <Tag size="sm" type={assigneeName ? "blue" : "gray"}>{assigneeName ?? "Unassigned"}</Tag>
      </div>
    </div>
  );
}

function CalendarView({
  tasks,
  alerts,
  today,
  canWrite,
  overDay,
  setOverDay,
  onDrop,
}: {
  tasks: BoardTask[];
  alerts: Map<string, TaskAlert>;
  today: string;
  canWrite: boolean;
  overDay: string | null;
  setOverDay: (d: string | null) => void;
  onDrop: (taskId: string, iso: string | null) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7)); // YYYY-MM

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const gridStart = addDays(first, -weekday);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [month]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  const undated = tasks.filter((t) => isOpen(t) && !t.due_date);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  const chip = (t: BoardTask) => {
    const a = t.status === "DONE" ? undefined : alerts.get(t.id);
    return (
      <div
        key={t.id}
        draggable={canWrite}
        onDragStart={(e) => startDrag(e, { kind: "task", id: t.id })}
        title={t.title}
        className="cds--type-helper-text-01"
        style={{
          background: a ? "var(--cds-support-error)" : t.status === "DONE" ? "var(--cds-layer-accent-01)" : "var(--cds-interactive)",
          color: a || t.status !== "DONE" ? "var(--cds-text-on-color)" : "var(--cds-text-primary)",
          padding: "0.125rem 0.375rem",
          cursor: canWrite ? "grab" : "default",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: t.status === "DONE" ? "line-through" : "none",
        }}
      >
        {t.title}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} iconDescription="Previous month" onClick={() => shiftMonth(-1)} />
        <h3 className="cds--type-heading-compact-02" style={{ minWidth: "9rem", textAlign: "center" }}>{label}</h3>
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} iconDescription="Next month" onClick={() => shiftMonth(1)} />
        <Button kind="tertiary" size="sm" onClick={() => setMonth(today.slice(0, 7))}>Today</Button>
      </div>

      <div
        onDragOver={allowDrop}
        onDrop={(e) => {
          const d = readDrag(e);
          if (d?.kind === "task" && canWrite) onDrop(d.id, null);
        }}
        style={{ background: "var(--cds-layer-01)", padding: "0.5rem", marginBottom: "0.75rem" }}
      >
        <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          No deadline ({undated.length}) — {canWrite ? "drag onto a day to set one; drop a dated task here to clear it" : "no deadline set"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>{undated.map(chip)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "1px", background: "var(--cds-border-subtle-01)" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="cds--type-label-01" style={{ background: "var(--cds-layer-01)", padding: "0.25rem 0.5rem" }}>{d}</div>
        ))}
        {cells.map((iso) => {
          const inMonth = iso.startsWith(month);
          const dayTasks = tasks.filter((t) => t.due_date === iso);
          return (
            <div
              key={iso}
              onDragOver={(e) => {
                allowDrop(e);
                setOverDay(iso);
              }}
              onDragLeave={() => setOverDay(overDay === iso ? null : overDay)}
              onDrop={(e) => {
                setOverDay(null);
                const d = readDrag(e);
                if (d?.kind === "task" && canWrite) onDrop(d.id, iso);
              }}
              style={{
                background: overDay === iso ? "var(--cds-layer-hover-01)" : inMonth ? "var(--cds-layer-01)" : "var(--cds-layer-02)",
                outline: iso === today ? "2px solid var(--cds-focus)" : "none",
                outlineOffset: "-2px",
                minHeight: "6rem",
                padding: "0.25rem",
                opacity: inMonth ? 1 : 0.6,
                display: "grid",
                alignContent: "start",
                gap: "0.125rem",
              }}
            >
              <span className="cds--type-label-01">{Number(iso.slice(8))}</span>
              {dayTasks.map(chip)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
