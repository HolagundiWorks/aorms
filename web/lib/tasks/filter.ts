import { addDays } from "./dates";

/** Task filter + sort model for the board/calendar. Pure so it can be tested and shared with the URL. */
export type DatePreset = "any" | "overdue" | "today" | "week" | "month" | "none" | "range";
export type SortKey = "priority" | "due" | "hours" | "recent" | "title";

export type TaskFilters = {
  q: string;
  project: string; // project id, "" = any
  assignee: string; // profile id, "unassigned", "" = any
  priority: string; // LOW | MEDIUM | HIGH | CRITICAL, "" = any
  date: DatePreset;
  from: string; // ISO, used when date === "range"
  to: string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: TaskFilters = { q: "", project: "", assignee: "", priority: "", date: "any", from: "", to: "", sort: "priority" };

export const SORT_LABEL: Record<SortKey, string> = {
  priority: "Priority",
  due: "Due date (soonest)",
  hours: "Effort (largest)",
  recent: "Recently added",
  title: "Title A–Z",
};

export type FilterableTask = {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  assignee_id: string | null;
  project_id?: string | null;
  project_title?: string | null;
  created_at?: string | null;
};

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRESETS: DatePreset[] = ["any", "overdue", "today", "week", "month", "none", "range"];
const SORTS: SortKey[] = ["priority", "due", "hours", "recent", "title"];

export function matchesDate(due: string | null, f: Pick<TaskFilters, "date" | "from" | "to">, today: string): boolean {
  switch (f.date) {
    case "any":
      return true;
    case "none":
      return due === null;
    case "overdue":
      return due !== null && due < today;
    case "today":
      return due === today;
    case "week":
      return due !== null && due >= today && due <= addDays(today, 6);
    case "month":
      return due !== null && due.slice(0, 7) === today.slice(0, 7);
    case "range":
      if (due === null) return false;
      return (!f.from || due >= f.from) && (!f.to || due <= f.to);
  }
}

export function matchesFilters(t: FilterableTask, f: TaskFilters, today: string): boolean {
  if (f.project && t.project_id !== f.project) return false;
  if (f.assignee === "unassigned" ? t.assignee_id !== null : f.assignee && t.assignee_id !== f.assignee) return false;
  if (f.priority && t.priority !== f.priority) return false;
  if (!matchesDate(t.due_date, f, today)) return false;
  const q = f.q.trim().toLowerCase();
  if (q && !`${t.title} ${t.project_title ?? ""}`.toLowerCase().includes(q)) return false;
  return true;
}

/** Stable comparator. Every sort falls back to priority then due date so equal keys never reshuffle randomly. */
export function compareTasks(a: FilterableTask, b: FilterableTask, sort: SortKey): number {
  const pri = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  const dueCmp = a.due_date === b.due_date ? 0 : a.due_date === null ? 1 : b.due_date === null ? -1 : a.due_date < b.due_date ? -1 : 1; // undated last
  switch (sort) {
    case "due":
      return dueCmp || pri || a.title.localeCompare(b.title);
    case "hours":
      return (b.estimated_hours ?? -1) - (a.estimated_hours ?? -1) || pri || dueCmp;
    case "recent":
      return (b.created_at ?? "").localeCompare(a.created_at ?? "") || pri;
    case "title":
      return a.title.localeCompare(b.title);
    default:
      return pri || dueCmp || a.title.localeCompare(b.title);
  }
}

export function activeFilterCount(f: TaskFilters): number {
  return [f.q.trim(), f.project, f.assignee, f.priority, f.date !== "any" ? f.date : ""].filter(Boolean).length;
}

// URL <-> filters. Only non-default values are written, so a clean board has a clean URL.
export function filtersToParams(f: TaskFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.project) p.set("project", f.project);
  if (f.assignee) p.set("assignee", f.assignee);
  if (f.priority) p.set("priority", f.priority);
  if (f.date !== "any") p.set("date", f.date);
  if (f.date === "range") {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.sort !== "priority") p.set("sort", f.sort);
  return p;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function filtersFromParams(get: (k: string) => string | null | undefined): TaskFilters {
  const date = get("date") as DatePreset;
  const sort = get("sort") as SortKey;
  const from = get("from") ?? "";
  const to = get("to") ?? "";
  return {
    q: (get("q") ?? "").slice(0, 100),
    project: get("project") ?? "",
    assignee: get("assignee") ?? "",
    priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(get("priority") ?? "") ? (get("priority") as string) : "",
    date: PRESETS.includes(date) ? date : "any",
    from: ISO.test(from) ? from : "",
    to: ISO.test(to) ? to : "",
    sort: SORTS.includes(sort) ? sort : "priority",
  };
}
