/**
 * Minimal error reporting (2026-10-01 audit: no monitoring existed). Writes one
 * structured JSON line to stderr (picked up by Hostinger's log viewer) and, when
 * ALERT_WEBHOOK_URL is set (a Slack/Discord-compatible incoming webhook), posts a short
 * alert. Never throws — reporting must not break the request it is reporting on.
 * This is deliberately not a vendor SDK; swap `reportError` for Sentry if/when a DSN exists.
 */
export async function reportError(scope: string, error: unknown, context: Record<string, unknown> = {}): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    console.error(JSON.stringify({ level: "error", scope, message, ...context, at: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `🚨 AORMS ${scope}: ${message}${Object.keys(context).length ? `\n${JSON.stringify(context)}` : ""}` }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* ignore */
  }
}
