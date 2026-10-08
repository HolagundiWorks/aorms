/** Minimal RFC 5545 calendar invite for a confirmed contractor meeting (UTC times). Pure. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildMeetingIcs(p: { uid: string; startsAt: Date; durationMinutes?: number; summary: string; place?: string | null; description?: string | null }): string {
  const end = new Date(p.startsAt.getTime() + (p.durationMinutes ?? 60) * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AORMS//Contractor Portal//EN",
    "BEGIN:VEVENT",
    `UID:${p.uid}@aorms.in`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(p.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(p.summary)}`,
    ...(p.place ? [`LOCATION:${esc(p.place)}`] : []),
    ...(p.description ? [`DESCRIPTION:${esc(p.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
