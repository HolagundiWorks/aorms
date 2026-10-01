import { describe, expect, it } from "vitest";
import { applyCapturedPayment } from "../lib/platform/licence-payment";
import { applyCapturedIdentityPayment } from "../lib/platform/identity-payment";

type Op = { table: string; op: "update" | "select"; values?: Record<string, unknown> };

/** Chainable, thenable stand-in for the Supabase query builder. */
function fakeService(handler: (op: Op) => { data?: unknown; error?: { message: string } | null }) {
  const log: Op[] = [];
  const service = {
    from(table: string) {
      const state: Op = { table, op: "select" };
      const builder: Record<string, unknown> = {
        update(values: Record<string, unknown>) {
          state.op = "update";
          state.values = values;
          return builder;
        },
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        maybeSingle: () => Promise.resolve(handler(state)),
        then(resolve: (v: unknown) => unknown) {
          log.push({ ...state });
          return Promise.resolve(handler(state)).then(resolve);
        },
      };
      return builder;
    },
  };
  return { service: service as never, log };
}

const payment = { id: "p1", studio_id: "s1", plan: "PRO", seats: 20, razorpay_payment_id: "pay_1" };

describe("applyCapturedPayment", () => {
  it("returns false and writes nothing else when the payment was already captured", async () => {
    const { service, log } = fakeService((o) => (o.table === "payments" ? { data: [] } : { data: null }));
    expect(await applyCapturedPayment(service, payment)).toBe(false);
    expect(log.some((o) => o.table === "licences")).toBe(false);
  });

  it("extends the licence after claiming the payment", async () => {
    const { service, log } = fakeService((o) => {
      if (o.table === "payments") return { data: [{ id: "p1" }] };
      if (o.table === "licences" && o.op === "select") return { data: { expires_at: null } };
      return { data: null, error: null };
    });
    expect(await applyCapturedPayment(service, payment)).toBe(true);
    const licenceUpdate = log.find((o) => o.table === "licences" && o.op === "update");
    expect(licenceUpdate?.values).toMatchObject({ plan: "PRO", seats: 20 });
  });

  it("releases the claim and throws if the licence update fails (payment must stay retryable)", async () => {
    const { service, log } = fakeService((o) => {
      if (o.table === "payments" && o.values?.status === "CAPTURED") return { data: [{ id: "p1" }] };
      if (o.table === "licences" && o.op === "select") return { data: { expires_at: null } };
      if (o.table === "licences" && o.op === "update") return { data: null, error: { message: "boom" } };
      return { data: null, error: null };
    });
    await expect(applyCapturedPayment(service, payment)).rejects.toThrow(/released for retry/);
    expect(log.some((o) => o.table === "payments" && o.values?.status === "AUTHORIZED")).toBe(true);
  });
});

describe("applyCapturedIdentityPayment", () => {
  it("releases the claim and throws if verification fails", async () => {
    const { service, log } = fakeService((o) => {
      if (o.table === "identity_payments" && o.values?.status === "CAPTURED") return { data: [{ id: "p1" }] };
      if (o.table === "identity_licences") return { data: null, error: { message: "nope" } };
      return { data: null, error: null };
    });
    await expect(applyCapturedIdentityPayment(service, { id: "p1", account_id: "a1", razorpay_payment_id: "x" })).rejects.toThrow(/released for retry/);
    expect(log.some((o) => o.table === "identity_payments" && o.values?.status === "AUTHORIZED")).toBe(true);
  });
});
