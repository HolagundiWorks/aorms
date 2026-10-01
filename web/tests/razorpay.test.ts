import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyPaymentSignature, verifyWebhookSignature } from "../lib/platform/razorpay";

const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

beforeAll(() => {
  process.env.RAZORPAY_KEY_SECRET = "key_secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "hook_secret";
});

describe("verifyWebhookSignature", () => {
  const body = '{"event":"payment.captured","payload":{}}';
  it("accepts a genuine signature", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: hmac("hook_secret", body) })).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature({ rawBody: body + " ", signature: hmac("hook_secret", body) })).toBe(false);
  });
  it("rejects a signature made with the wrong secret", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: hmac("key_secret", body) })).toBe(false);
  });
  it("rejects a wrong-length / non-hex signature without throwing", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: "abcd" })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: "" })).toBe(false);
  });
});

describe("verifyPaymentSignature", () => {
  it("verifies order_id|payment_id with the key secret", () => {
    const sig = hmac("key_secret", "order_1|pay_1");
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig })).toBe(true);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_2", signature: sig })).toBe(false);
  });
});
