// Date helpers for task scheduling. All dates are ISO `YYYY-MM-DD` strings
// handled in UTC so a server/browser timezone difference can never shift a
// deadline by a day (tasks.due_date is a plain `date` column).

/** Productive design hours per person per working day (not the 8h contract day — meetings, site calls, review). */
export const HOURS_PER_DAY = 6;

/** Working days per week: Mon–Fri. Change here to move the whole scheduler to a 6-day week. */
const isWorkday = (d: Date) => {
  const wd = d.getUTCDay();
  return wd !== 0 && wd !== 6;
};

export const parseISO = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Working days from `fromISO` to `toISO`, both inclusive. 0 if `toISO` is before `fromISO`. */
export function countWorkdays(fromISO: string, toISOStr: string): number {
  if (toISOStr < fromISO) return 0;
  let n = 0;
  const d = parseISO(fromISO);
  const end = parseISO(toISOStr);
  while (d <= end) {
    if (isWorkday(d)) n += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

/** The date `days` working days of effort finish on, starting on `startISO` (a start on a weekend rolls to Monday). At least 1 day. */
export function addWorkdays(startISO: string, days: number): string {
  const d = parseISO(startISO);
  while (!isWorkday(d)) d.setUTCDate(d.getUTCDate() + 1);
  let remaining = Math.max(1, Math.ceil(days)) - 1;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkday(d)) remaining -= 1;
  }
  return toISO(d);
}
