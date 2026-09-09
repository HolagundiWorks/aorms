import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay integration — hand-rolled (plain REST + node:crypto), not the
 * official `razorpay` npm SDK. Matches this codebase's established
 * preference for a small, well-documented HTTP surface over a new
 * dependency (see web/lib/ai/ollama.ts: "calling Ollama's plain HTTP API
 * directly, no [SDK] dependency"). Server-only — every function here needs
 * RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET, never expose those to the
 * client.
 *
 * Reference: https://razorpay.com/docs/api/orders/ and
 * https://razorpay.com/docs/webhooks/validate-test/
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see web/.env.example`);
  return value;
}

function basicAuthHeader(): string {
  const keyId = requireEnv("RAZORPAY_KEY_ID");
  const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

/**
 * Creates a Razorpay Order — the object Checkout.js needs client-side to
 * open the payment sheet. `amountPaise` matches this codebase's own money
 * convention; Razorpay's API also expects the smallest currency unit
 * (paise for INR), so no conversion is needed.
 */
export async function createOrder(params: {
  amountPaise: number;
  currency?: string;
  receipt: string;
}): Promise<RazorpayOrder> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency ?? "INR",
      receipt: params.receipt,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Razorpay createOrder failed (${res.status}): ${body}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verifies the signature Checkout.js's success handler hands back
 * client-side (razorpay_order_id, razorpay_payment_id,
 * razorpay_signature) — HMAC-SHA256 of "order_id|payment_id" using
 * RAZORPAY_KEY_SECRET, per Razorpay's documented client-side verification
 * scheme. This is the fast-path UX check only; the webhook (verified
 * separately below, with a different secret) is the durable source of
 * truth — see web/app/api/razorpay/webhook/route.ts.
 */
export function verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
  const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  const expected = createHmac("sha256", keySecret).update(`${params.orderId}|${params.paymentId}`).digest("hex");
  return safeCompare(expected, params.signature);
}

/**
 * Verifies the `X-Razorpay-Signature` header on an incoming webhook
 * request — HMAC-SHA256 of the raw request body using
 * RAZORPAY_WEBHOOK_SECRET (a separate secret from RAZORPAY_KEY_SECRET,
 * configured when the webhook URL is registered in Razorpay's dashboard).
 * `rawBody` must be the exact bytes Razorpay sent, not a re-serialized
 * JSON.parse(...) round-trip — whitespace/key-order differences would
 * make the HMAC not match even for a genuine request.
 */
export function verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean {
  const webhookSecret = requireEnv("RAZORPAY_WEBHOOK_SECRET");
  const expected = createHmac("sha256", webhookSecret).update(params.rawBody).digest("hex");
  return safeCompare(expected, params.signature);
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(actual, "hex");
  // Different lengths would throw inside timingSafeEqual rather than just
  // returning false — an attacker-controlled signature header must not be
  // able to trigger a different code path (even an exception) than a
  // wrong-but-same-length one.
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
