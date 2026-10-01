import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceRoleClient } from "../../../../lib/platform/service";
import { mailerConfigured, sendEmail } from "../../../../lib/email/send";

/**
 * Licence-expiry reminders (2026-10-01, roadmap P2). Call daily from Hostinger's cron
 * (hPanel → Cron Jobs): `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://aorms.in/api/cron/licence-reminders`.
 * Sends the Studio OWNER one email per (licence, stage, expiry date): T30 (≤30 days
 * left), T7 (≤7), T0 (expired in the last 3 days). `public.licence_reminders` has a
 * unique key on those three so a re-run never double-sends, and a row is only written
 * after the email is actually sent. Does nothing (and says so) if SMTP isn't configured.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const DAY = 86_400_000;

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mailerConfigured()) return NextResponse.json({ sent: 0, skipped: "SMTP not configured" });

  const svc = createServiceRoleClient();
  const now = Date.now();
  const { data: licences, error } = await svc
    .from("licences")
    .select("id, plan, expires_at, studios(name, owner_id)")
    .neq("plan", "FREE")
    .not("expires_at", "is", null)
    .lte("expires_at", new Date(now + 30 * DAY).toISOString())
    .gte("expires_at", new Date(now - 3 * DAY).toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const l of licences ?? []) {
    const studio = (Array.isArray(l.studios) ? l.studios[0] : l.studios) as { name: string; owner_id: string | null } | null;
    if (!studio?.owner_id || !l.expires_at) continue;
    const msLeft = new Date(l.expires_at).getTime() - now;
    const kind = msLeft <= 0 ? "T0" : msLeft <= 7 * DAY ? "T7" : "T30";

    const { data: already } = await svc.from("licence_reminders").select("id").eq("licence_id", l.id).eq("kind", kind).eq("expires_at", l.expires_at).maybeSingle();
    if (already) continue;

    const { data: owner } = await svc.auth.admin.getUserById(studio.owner_id);
    const email = owner?.user?.email;
    if (!email) continue;

    const when = new Date(l.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    const subject =
      kind === "T0" ? `Your AORMS ${l.plan} licence for ${studio.name} has expired` : `Your AORMS ${l.plan} licence for ${studio.name} expires on ${when}`;
    const body =
      kind === "T0"
        ? `The ${l.plan} licence for ${studio.name} expired on ${when}. Renew it from Licences in your Identity portal to restore paid features.`
        : `The ${l.plan} licence for ${studio.name} expires on ${when}. Renew from Licences in your Identity portal to avoid any interruption.`;
    const res = await sendEmail({ to: email, subject, text: `${body}\n\nhttps://identity.aorms.in/licences\n\n— AORMS` });
    if (!res.sent) {
      failed++;
      continue;
    }
    await svc.from("licence_reminders").insert({ licence_id: l.id, kind, expires_at: l.expires_at });
    sent++;
  }
  return NextResponse.json({ sent, failed, considered: licences?.length ?? 0 });
}
