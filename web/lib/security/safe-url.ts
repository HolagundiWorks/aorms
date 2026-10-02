/**
 * Outbound-URL guard for admin-configured endpoints (2026-10-02 security audit, SSRF).
 * Server-side `fetch` of a URL a staff member typed in can reach cloud metadata services
 * or link-local addresses. This rejects non-http(s) schemes, embedded credentials,
 * link-local / metadata hosts. Loopback and private ranges stay allowed on purpose (a
 * local Ollama or an on-prem gateway is a legitimate connector).
 */
const BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata", "instance-data"]);

export function validateOutboundUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "That isn't a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "Only http(s) URLs are allowed." };
  if (url.username || url.password) return { ok: false, error: "Don't put credentials in the URL — use the API key field." };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return { ok: false, error: "That host isn't allowed." };
  // IPv4 link-local (169.254.0.0/16 — includes the 169.254.169.254 metadata address) and IPv6 link-local.
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return { ok: false, error: "Link-local addresses aren't allowed." };
  // Numeric/octal/hex IPv4 forms that resolve to link-local are normalised by URL(), so the check above covers them.
  return { ok: true, url };
}
