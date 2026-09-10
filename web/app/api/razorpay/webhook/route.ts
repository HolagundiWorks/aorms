import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "../../../../lib/platform/razorpay";
import { createServiceRoleClient } from "../../../../lib/platform/service";
import { applyCapturedPayment } from "../../../../lib/platform/licence-payment";
import { applyCapturedConnectDexPayment } from "../../../../lib/platform/connectdex-payment";

/**
 * Razorpay webhook — the durable source of truth for both licence
 * payments (Studio) and ConnectDeX Partners onboarding fees (Company),
 * per lib/actions/platform-payments.ts's and lib/actions/connectdex.ts's
 * own header comments. Configure this URL
 * (https://aorms.in/api/razorpay/webhook) in Razorpay's dashboard under
 * Settings → Webhooks, select at minimum `payment.captured` and
 * `payment.failed`, and set RAZORPAY_WEBHOOK_SECRET to the secret Razorpay
 * generates for that specific webhook (a different secret from
 * RAZORPAY_KEY_SECRET — see web/.env.example).
 *
 * No Supabase Auth session involved at all — server-to-server, same shape
 * as app/api/calendar/[token]/route.ts's own "the token/signature IS the
 * entire authorization check" reasoning, except here the "token" is an
 * HMAC over the raw body rather than a stored per-user secret.
 *
 * Reads the raw body via request.text() (not request.json()) because
 * signature verification needs the exact bytes Razorpay sent — a
 * JSON.parse → JSON.stringify round-trip is not guaranteed byte-identical
 * (key order, whitespace) and would make a genuine request's signature
 * fail to verify.
 *
 * One Razorpay order id can only ever belong to one of `payments` /
 * `connectdex_payments` (each order is created against exactly one of the
 * two tables, in lib/actions/platform-payments.ts's createLicenceOrder or
 * lib/actions/connectdex.ts's createConnectDexOnboardingOrder
 * respectively) — this handler checks `payments` first, and only checks
 * `connectdex_payments` if nothing matched there, rather than assuming
 * which one a given order belongs to.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature({ rawBody, signature })) {
    // 400, not 401/403 — Razorpay's own docs recommend a 4xx here so it
    // doesn't endlessly retry a request that will never verify (a genuine
    // signature mismatch, as opposed to a transient failure on our side).
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (event.event === "payment.captured" && orderId && paymentId) {
    const platformService = createServiceRoleClient();
    const { data: licenceRow } = await platformService
      .from("payments")
      .select("id, studio_id, plan, seats, status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    // Idempotent against confirmPaymentClientSide's own fast path — if
    // that already applied this payment, skip re-applying it (would
    // otherwise double-extend expires_at).
    if (licenceRow) {
      if (licenceRow.status !== "CAPTURED") {
        await applyCapturedPayment(platformService, { ...licenceRow, razorpay_payment_id: paymentId });
      }
    } else {
      const { data: connectDexRow } = await platformService
        .from("connectdex_payments")
        .select("id, company_id, status")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();
      if (connectDexRow && connectDexRow.status !== "CAPTURED") {
        await applyCapturedConnectDexPayment(platformService, { ...connectDexRow, razorpay_payment_id: paymentId });
      }
    }
  } else if (event.event === "payment.failed" && orderId) {
    const platformService = createServiceRoleClient();
    const { data: failedLicenceRows } = await platformService
      .from("payments")
      .update({ status: "FAILED", updated_at: new Date().toISOString() })
      .eq("razorpay_order_id", orderId)
      .select("id");
    if (!failedLicenceRows || failedLicenceRows.length === 0) {
      await platformService
        .from("connectdex_payments")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("razorpay_order_id", orderId);
    }
  }

  // Always 200 for a signature-verified, recognized request — Razorpay
  // retries on non-2xx, and an event type this handler doesn't act on yet
  // (e.g. payment.authorized) isn't a failure, just a no-op.
  return NextResponse.json({ ok: true });
}
