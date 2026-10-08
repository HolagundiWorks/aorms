/**
 * Critical Path Method engine (PDM: FS/SS/FF/SF with lag) — port of HolagundiWorks/AQC's `ScheduleCalculator.cs`.
 * Kahn topological sort (leftovers are a cycle), forward pass ES/EF, backward pass LS/LF, total float; an
 * activity is critical when its total float is ~0.
 */

export type DependencyType = "FS" | "SS" | "FF" | "SF";
export type ActivityLink = { predecessorId: string; type: DependencyType; lagDays: number };
export type Activity = { id: string; durationDays: number; links: ActivityLink[] };
export type ComputedActivity = Activity & {
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
  inCycle: boolean;
};
export type CpmResult = { activities: ComputedActivity[]; projectDurationDays: number; criticalCount: number; hasCycle: boolean };

export function computeCpm(input: Activity[]): CpmResult {
  const acts: ComputedActivity[] = input.map((a) => ({ ...a, earlyStart: 0, earlyFinish: 0, lateStart: 0, lateFinish: 0, totalFloat: 0, isCritical: false, inCycle: false }));
  if (acts.length === 0) return { activities: acts, projectDurationDays: 0, criticalCount: 0, hasCycle: false };

  const byId = new Map(acts.map((a) => [a.id, a]));
  const successors = new Map<string, { succ: ComputedActivity; link: ActivityLink }[]>();
  const deg = new Map<string, number>(acts.map((a) => [a.id, 0]));
  for (const a of acts) {
    for (const l of a.links) {
      if (!byId.has(l.predecessorId) || l.predecessorId === a.id) continue;
      const list = successors.get(l.predecessorId) ?? [];
      list.push({ succ: a, link: l });
      successors.set(l.predecessorId, list);
      deg.set(a.id, (deg.get(a.id) ?? 0) + 1);
    }
  }

  const topo: ComputedActivity[] = [];
  const queue = acts.filter((a) => deg.get(a.id) === 0);
  while (queue.length) {
    const a = queue.shift()!;
    topo.push(a);
    for (const { succ } of successors.get(a.id) ?? []) {
      const d = (deg.get(succ.id) ?? 0) - 1;
      deg.set(succ.id, d);
      if (d === 0) queue.push(succ);
    }
  }
  const hasCycle = topo.length < acts.length;
  if (hasCycle) {
    const sorted = new Set(topo.map((a) => a.id));
    for (const a of acts) if (!sorted.has(a.id)) a.inCycle = true;
  }

  for (const a of topo) {
    let es = 0;
    for (const l of a.links) {
      const p = byId.get(l.predecessorId);
      if (!p || p.inCycle) continue;
      const c =
        l.type === "FS" ? p.earlyFinish + l.lagDays
        : l.type === "SS" ? p.earlyStart + l.lagDays
        : l.type === "FF" ? p.earlyFinish + l.lagDays - a.durationDays
        : p.earlyStart + l.lagDays - a.durationDays;
      if (c > es) es = c;
    }
    a.earlyStart = Math.max(0, es);
    a.earlyFinish = a.earlyStart + Math.max(0, a.durationDays);
  }

  const projectFinish = topo.reduce((m, a) => Math.max(m, a.earlyFinish), 0);

  for (let i = topo.length - 1; i >= 0; i--) {
    const a = topo[i];
    let lf = projectFinish;
    for (const { succ: s, link: l } of successors.get(a.id) ?? []) {
      if (s.inCycle) continue;
      const c =
        l.type === "FS" ? s.lateStart - l.lagDays
        : l.type === "SS" ? s.lateStart - l.lagDays + a.durationDays
        : l.type === "FF" ? s.lateFinish - l.lagDays
        : s.lateFinish - l.lagDays + a.durationDays;
      if (c < lf) lf = c;
    }
    a.lateFinish = lf;
    a.lateStart = lf - Math.max(0, a.durationDays);
    a.totalFloat = a.lateStart - a.earlyStart;
    a.isCritical = !a.inCycle && Math.abs(a.totalFloat) < 1e-3;
  }

  return { activities: acts, projectDurationDays: projectFinish, criticalCount: acts.filter((a) => a.isCritical).length, hasCycle };
}

/** Calendar date for a day offset from the schedule start (ISO yyyy-mm-dd). */
export function dateForOffset(startIso: string, offsetDays: number): string {
  const d = new Date(`${startIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(offsetDays));
  return d.toISOString().slice(0, 10);
}
