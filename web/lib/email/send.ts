import nodemailer from "nodemailer";

/**
 * Transactional mail for the Platform (2026-10-01, roadmap P2). Until now the only
 * emails were Supabase Auth's fixed templates; HelpDeX replies and licence-expiry
 * reminders need arbitrary messages. Configure with SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS / SMTP_FROM (the Hostinger mailbox already used by aorms-platform's Auth
 * works: smtp.hostinger.com:465, hi@aorms.in). With SMTP_HOST unset this is a no-op
 * that reports `sent: false` — callers must say so rather than imply delivery.
 */
export type SendResult = { sent: true } | { sent: false; reason: string };

export function mailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(params: { to: string; subject: string; text: string; replyTo?: string }): Promise<SendResult> {
  if (!mailerConfigured()) return { sent: false, reason: "Email isn't configured on this deployment (SMTP_* not set)." };
  try {
    const port = Number(process.env.SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      replyTo: params.replyTo,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Send failed." };
  }
}
